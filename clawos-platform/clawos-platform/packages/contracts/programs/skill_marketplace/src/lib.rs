use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

decl_id!("CLAWoSGaA5MzY1kzJ4k2g8fJ5v9xQzR7yTyUv9d9KdM3");

#[program]
pub mod skill_marketplace {
    use super::*;

    // Initialize marketplace with platform fee
    pub fn initialize_marketplace(
        ctx: Context<InitializeMarketplace>,
        platform_fee_bps: u16,
    ) -> Result<()> {
        require!(
            platform_fee_bps <= 1000,
            ErrorCode::InvalidFee
        );

        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.platform_fee_bps = platform_fee_bps;
        marketplace.treasury = ctx.accounts.treasury.key();
        marketplace.skill_count = 0;
        marketplace.bump = ctx.bumps.marketplace;

        msg!("Marketplace initialized with fee: {} bps", platform_fee_bps);
        Ok(())
    }

    // Register a skill listing
    pub fn list_skill(
        ctx: Context<ListSkill>,
        skill_id: String,
        price: u64,
        is_subscription: bool,
        subscription_duration: Option<i64>,
    ) -> Result<()> {
        require!(
            skill_id.len() <= 64,
            ErrorCode::SkillIdTooLong
        );
        require!(
            price > 0,
            ErrorCode::InvalidPrice
        );

        let skill_listing = &mut ctx.accounts.skill_listing;
        skill_listing.seller = ctx.accounts.seller.key();
        skill_listing.skill_id = skill_id.clone();
        skill_listing.price = price;
        skill_listing.is_subscription = is_subscription;
        skill_listing.subscription_duration = subscription_duration;
        skill_listing.is_active = true;
        skill_listing.created_at = Clock::get()?.unix_timestamp;
        skill_listing.bump = ctx.bumps.skill_listing;

        // Increment marketplace skill count
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.skill_count += 1;

        emit!(SkillListed {
            seller: ctx.accounts.seller.key(),
            skill_id: skill_id.clone(),
            price,
        });

        msg!("Skill listed: {} for {} lamports", skill_id, price);
        Ok(())
    }

    // Purchase skill access
    pub fn purchase_skill(
        ctx: Context<PurchaseSkill>,
        skill_id: String,
    ) -> Result<()> {
        let skill_listing = &ctx.accounts.skill_listing;
        let marketplace = &ctx.accounts.marketplace;
        
        require!(
            skill_listing.skill_id == skill_id,
            ErrorCode::InvalidSkill
        );
        require!(
            skill_listing.is_active,
            ErrorCode::SkillNotActive
        );

        let price = skill_listing.price;
        let platform_fee = price
            .checked_mul(marketplace.platform_fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();

        // Transfer payment from buyer to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, price)?;

        // Create license
        let license = &mut ctx.accounts.license;
        license.owner = ctx.accounts.buyer.key();
        license.skill_listing = skill_listing.key();
        license.purchase_price = price;
        license.platform_fee = platform_fee;
        license.is_active = true;
        license.usage_count = 0;
        license.bump = ctx.bumps.license;
        
        if skill_listing.is_subscription {
            license.expires_at = Some(
                Clock::get()?.unix_timestamp + 
                skill_listing.subscription_duration.unwrap_or(30 * 24 * 60 * 60)
            );
        } else {
            license.expires_at = None;
        }
        license.created_at = Clock::get()?.unix_timestamp;
        license.last_used_at = 0;

        // Emit purchase event
        emit!(SkillPurchased {
            buyer: ctx.accounts.buyer.key(),
            seller: skill_listing.seller,
            skill_id: skill_id.clone(),
            price,
            license: license.key(),
        });

        msg!("Skill purchased: {} by {}", skill_id, ctx.accounts.buyer.key());
        Ok(())
    }

    // Claim payment (seller withdraws)
    pub fn claim_payment(ctx: Context<ClaimPayment>) -> Result<()> {
        let skill_listing = &ctx.accounts.skill_listing;
        let marketplace = &ctx.accounts.marketplace;
        
        require!(
            skill_listing.seller == ctx.accounts.seller.key(),
            ErrorCode::Unauthorized
        );

        // Calculate amounts
        let escrow_balance = ctx.accounts.escrow_token_account.amount;
        let platform_fee = escrow_balance
            .checked_mul(marketplace.platform_fee_bps as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        let seller_amount = escrow_balance - platform_fee;

        let skill_id = skill_listing.skill_id.clone();

        // Transfer to seller
        let seeds = &[
            b"escrow",
            skill_id.as_bytes(),
            &[ctx.bumps.escrow_token_account],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, seller_amount)?;

        // Transfer platform fee to treasury
        let cpi_accounts_fee = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_ctx_fee = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_fee,
            signer,
        );
        token::transfer(cpi_ctx_fee, platform_fee)?;

        emit!(PaymentClaimed {
            seller: skill_listing.seller,
            skill_id: skill_id.clone(),
            amount: seller_amount,
            fee: platform_fee,
        });

        msg!("Payment claimed: {} - {} lamports", skill_id, seller_amount);
        Ok(())
    }

    // Verify license (called by execution proxy)
    pub fn verify_license(
        ctx: Context<VerifyLicense>,
    ) -> Result<LicenseStatus> {
        let license = &ctx.accounts.license;
        
        if !license.is_active {
            return Ok(LicenseStatus::Inactive);
        }

        if let Some(expires_at) = license.expires_at {
            if Clock::get()?.unix_timestamp > expires_at {
                return Ok(LicenseStatus::Expired);
            }
        }

        // Increment usage for tracking
        let license_mut = &mut ctx.accounts.license;
        license_mut.usage_count += 1;
        license_mut.last_used_at = Clock::get()?.unix_timestamp;

        Ok(LicenseStatus::Active)
    }

    // Update skill status (deactivate)
    pub fn update_skill_status(
        ctx: Context<UpdateSkillStatus>,
        is_active: bool,
    ) -> Result<()> {
        let skill_listing = &mut ctx.accounts.skill_listing;
        
        require!(
            skill_listing.seller == ctx.accounts.seller.key(),
            ErrorCode::Unauthorized
        );

        skill_listing.is_active = is_active;

        msg!("Skill status updated: {} -> active: {}", skill_listing.skill_id, is_active);
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::SIZE,
        seeds = [b"marketplace"],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury account
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(skill_id: String)]
pub struct ListSkill<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        init,
        payer = seller,
        space = 8 + SkillListing::SIZE,
        seeds = [b"skill", seller.key().as_ref(), skill_id.as_bytes()],
        bump
    )]
    pub skill_listing: Account<'info, SkillListing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(skill_id: String)]
pub struct PurchaseSkill<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        seeds = [b"skill", skill_listing.seller.as_ref(), skill_id.as_bytes()],
        bump = skill_listing.bump,
    )]
    pub skill_listing: Account<'info, SkillListing>,
    #[account(
        init,
        payer = buyer,
        space = 8 + License::SIZE,
        seeds = [b"license", buyer.key().as_ref(), skill_listing.key().as_ref()],
        bump
    )]
    pub license: Account<'info, License>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == usdc_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        seeds = [b"escrow", skill_id.as_bytes()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_token_account,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimPayment<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub skill_listing: Account<'info, SkillListing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", skill_listing.skill_id.as_bytes()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_token_account,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_token_account.owner == seller.key(),
        constraint = seller_token_account.mint == usdc_mint.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = treasury_token_account.owner == marketplace.treasury,
        constraint = treasury_token_account.mint == usdc_mint.key()
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct VerifyLicense<'info> {
    #[account(mut)]
    pub license: Account<'info, License>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateSkillStatus<'info> {
    #[account(mut)]
    pub skill_listing: Account<'info, SkillListing>,
    pub seller: Signer<'info>,
}

// Data Structures

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub platform_fee_bps: u16,
    pub skill_count: u64,
    pub bump: u8,
}

impl Marketplace {
    pub const SIZE: usize = 32 + 32 + 2 + 8 + 1;
}

#[account]
pub struct SkillListing {
    pub seller: Pubkey,
    pub skill_id: String,
    pub price: u64,
    pub is_subscription: bool,
    pub subscription_duration: Option<i64>,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl SkillListing {
    // String: 4 bytes length + max 64 bytes
    // Option<i64>: 1 byte discriminant + 8 bytes
    pub const SIZE: usize = 32 + (4 + 64) + 8 + 1 + (1 + 8) + 1 + 8 + 1;
}

#[account]
pub struct License {
    pub owner: Pubkey,
    pub skill_listing: Pubkey,
    pub purchase_price: u64,
    pub platform_fee: u64,
    pub is_active: bool,
    pub usage_count: u64,
    pub expires_at: Option<i64>,
    pub created_at: i64,
    pub last_used_at: i64,
    pub bump: u8,
}

impl License {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 1 + 8 + (1 + 8) + 8 + 8 + 1;
}

// Enums and Events

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum LicenseStatus {
    Active,
    Inactive,
    Expired,
}

#[event]
pub struct SkillListed {
    pub seller: Pubkey,
    pub skill_id: String,
    pub price: u64,
}

#[event]
pub struct SkillPurchased {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub skill_id: String,
    pub price: u64,
    pub license: Pubkey,
}

#[event]
pub struct PaymentClaimed {
    pub seller: Pubkey,
    pub skill_id: String,
    pub amount: u64,
    pub fee: u64,
}

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid platform fee")]
    InvalidFee,
    #[msg("Skill ID too long")]
    SkillIdTooLong,
    #[msg("Invalid skill")]
    InvalidSkill,
    #[msg("Skill not active")]
    SkillNotActive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid price")]
    InvalidPrice,
}
