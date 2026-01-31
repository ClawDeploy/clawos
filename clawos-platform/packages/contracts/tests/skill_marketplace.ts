import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SkillMarketplace } from "../target/types/skill_marketplace";
import { expect } from "chai";

describe("skill_marketplace", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SkillMarketplace as Program<SkillMarketplace>;
  
  const authority = provider.wallet;
  const seller = anchor.web3.Keypair.generate();
  const buyer = anchor.web3.Keypair.generate();
  const treasury = anchor.web3.Keypair.generate();

  let marketplace: anchor.web3.PublicKey;
  let marketplaceBump: number;

  before(async () => {
    // Airdrop SOL to seller and buyer
    await provider.connection.requestAirdrop(
      seller.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Find marketplace PDA
    [marketplace, marketplaceBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("marketplace")],
      program.programId
    );
  });

  it("Initialize marketplace", async () => {
    await program.methods
      .initializeMarketplace(250) // 2.5% fee
      .accounts({
        marketplace,
        authority: authority.publicKey,
        treasury: treasury.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const marketplaceAccount = await program.account.marketplace.fetch(marketplace);
    expect(marketplaceAccount.platformFeeBps).to.equal(250);
    expect(marketplaceAccount.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(marketplaceAccount.treasury.toBase58()).to.equal(treasury.publicKey.toBase58());
  });

  it("List a skill", async () => {
    const skillId = "skill_123";
    const price = new anchor.BN(1000000); // 1 USDC
    
    const [skillListing] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("skill"), seller.publicKey.toBuffer(), Buffer.from(skillId)],
      program.programId
    );

    await program.methods
      .listSkill(skillId, price, false, null)
      .accounts({
        marketplace,
        skillListing,
        seller: seller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const skillAccount = await program.account.skillListing.fetch(skillListing);
    expect(skillAccount.skillId).to.equal(skillId);
    expect(skillAccount.price.toNumber()).to.equal(price.toNumber());
    expect(skillAccount.seller.toBase58()).to.equal(seller.publicKey.toBase58());
    expect(skillAccount.isActive).to.be.true;
  });

  it("Cannot list skill with invalid fee", async () => {
    try {
      await program.methods
        .initializeMarketplace(1500) // 15% - too high
        .accounts({
          marketplace,
          authority: authority.publicKey,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.toString()).to.include("InvalidFee");
    }
  });

  it("Cannot list skill with too long ID", async () => {
    const skillId = "a".repeat(65); // Too long
    const price = new anchor.BN(1000000);
    
    const [skillListing] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("skill"), seller.publicKey.toBuffer(), Buffer.from(skillId)],
      program.programId
    );

    try {
      await program.methods
        .listSkill(skillId, price, false, null)
        .accounts({
          marketplace,
          skillListing,
          seller: seller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([seller])
        .rpc();
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.toString()).to.include("SkillIdTooLong");
    }
  });
});
