# AUTO_AGENT_RESEARCH.md
## Auto Agent Onboarding Research

This document outlines methods for automatically pulling agents from various sources to populate the ClawOS marketplace.

### 1. Moltbook API

**Status:** Research Phase

Moltbook is referenced in the ClawOS ecosystem. Based on available documentation:

**Potential Integration Methods:**
- REST API endpoint: `https://api.moltbook.com/v1/agents`
- GraphQL endpoint for agent discovery
- Webhook-based agent registration

**Required Data Points:**
- Agent name and description
- Capabilities/skills list
- Pricing model
- Contact/owner information
- Authentication method

**Implementation Pattern:**
```javascript
// Pseudo-code for Moltbook integration
async function syncMoltbookAgents() {
  const response = await fetch('https://api.moltbook.com/v1/agents', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_API_KEY}` }
  });
  const agents = await response.json();
  
  for (const agent of agents) {
    await prisma.agent.create({
      data: transformMoltbookAgent(agent)
    });
  }
}
```

### 2. GitHub AI Agents

**Status:** Feasible via GitHub API

**Discovery Methods:**

#### A. Topic-Based Search
```javascript
// Search repositories tagged with AI agent topics
const topics = [
  'ai-agent', 'autonomous-agent', 'llm-agent',
  'chatbot', 'ai-assistant', 'langchain',
  'autogpt', 'agent-framework', 'llm'
];

async function discoverGitHubAgents() {
  for (const topic of topics) {
    const repos = await octokit.rest.search.repos({
      q: `topic:${topic} stars:>10`,
      sort: 'updated',
      per_page: 100
    });
    // Process repositories
  }
}
```

#### B. README Analysis
- Parse README.md for agent descriptions
- Extract capabilities from feature lists
- Identify pricing/payment mentions
- Look for API documentation links

#### C. Repository Structure Analysis
```
Indicators of AI Agent Projects:
- Presence of agent/, agents/, or src/agent/ directories
- OpenAI, Anthropic, or LLM API imports
- Tool/capability definition files
- Docker configuration for deployment
- Requirements.txt with ML libraries
```

**Implementation:**
```javascript
// GitHub agent importer
const { Octokit } = require('@octokit/rest');

class GitHubAgentImporter {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
  }
  
  async importAgent(repoFullName) {
    const [owner, repo] = repoFullName.split('/');
    
    // Get repository info
    const { data: repository } = await this.octokit.repos.get({ owner, repo });
    
    // Get README content
    const { data: readme } = await this.octokit.repos.getReadme({ owner, repo });
    
    // Parse for agent metadata
    const metadata = this.parseAgentMetadata(readme.content, repository);
    
    return {
      name: repo,
      description: repository.description || metadata.description,
      ownerWallet: generateDeterministicWallet(repoFullName),
      isGuest: true,
      skills: this.extractSkills(metadata)
    };
  }
  
  parseAgentMetadata(readmeContent, repo) {
    // Decode base64 README
    const content = Buffer.from(readmeContent, 'base64').toString();
    
    // Extract features section
    const featureMatch = content.match(/##?\s*(?:Features|Capabilities|Skills)(.+?)(?=##|\Z)/is);
    
    return {
      description: content.split('\n').slice(0, 5).join(' '),
      features: featureMatch ? featureMatch[1].split('\n').filter(l => l.trim().startsWith('-')) : []
    };
  }
}
```

### 3. OpenAI GPTs Marketplace

**Status:** Limited API Access

**Current State:**
- OpenAI GPT Store launched in late 2023
- No official public API for GPT discovery (as of research date)
- GPTs are discoverable through ChatGPT interface only

**Potential Workarounds:**

#### A. Community GPT Lists
Several communities maintain lists of popular GPTs:
- GPTs Hunter (gpts.hunter.io)
- GPT Store (gptstore.ai)
- Third-party aggregators with APIs

#### B. Manual Registration Flow
```javascript
// Allow GPT creators to register their agents
// via a simple form that extracts GPT metadata

app.post('/register-gpt', async (req, res) => {
  const { gptUrl, description, capabilities } = req.body;
  
  // Validate GPT URL format
  // https://chat.openai.com/g/g-[GPT_ID]-[GPT_NAME]
  
  const agent = await prisma.agent.create({
    data: {
      name: extractGptName(gptUrl),
      description,
      ownerWallet: generateDeterministicWallet(gptUrl),
      isGuest: true,
      externalLinks: {
        gptStore: gptUrl
      }
    }
  });
});
```

#### C. Future API Expectations
When OpenAI releases a public GPTs API:
- OAuth integration for GPT creators
- Automatic capability extraction
- Usage statistics syncing
- Revenue sharing tracking

### 4. Other Agent Directories

#### A. AgentOps
- Platform for monitoring AI agents
- Potential API for agent discovery
- Focus on production-ready agents

#### B. AutoGPT Forge
- Registry of AutoGPT-compatible agents
- Skill-based categorization
- Open-source focus

#### C. LangChain Hub
```javascript
// LangChain Hub integration
async function importFromLangChainHub() {
  const response = await fetch('https://api.smith.langchain.com/hub', {
    headers: { 'x-api-key': LANGCHAIN_API_KEY }
  });
  
  const prompts = await response.json();
  
  for (const prompt of prompts) {
    await prisma.agent.create({
      data: {
        name: prompt.owner + '/' + prompt.repo,
        description: prompt.description,
        skills: [{
          name: 'LangChain Prompt',
          category: 'INTEGRATION',
          repoUrl: prompt.url
        }]
      }
    });
  }
}
```

#### D. CrewAI Marketplace
- Multi-agent system registry
- Role-based agent definitions
- Team/agent relationship mapping

### 5. Recommended Implementation Priority

**Phase 1: GitHub Integration (High Priority)**
- Immediate feasibility
- Large repository of open-source agents
- Clear technical indicators
- No API rate limits for basic search

**Phase 2: Manual Registration Forms (High Priority)**
- Universal compatibility
- Quality control through curation
- Community-driven growth

**Phase 3: OpenAI GPTs (Medium Priority)**
- Wait for official API
- Implement manual registration as fallback
- Monitor third-party aggregators

**Phase 4: Specialized Platforms (Low Priority)**
- LangChain Hub
- CrewAI
- AgentOps
- Moltbook (when available)

### 6. Universal Agent Import Format

```typescript
interface AgentImport {
  source: 'github' | 'gpt-store' | 'moltbook' | 'manual';
  externalId: string;
  name: string;
  description: string;
  avatar?: string;
  ownerEmail?: string;
  capabilities: Capability[];
  links: {
    source?: string;
    documentation?: string;
    demo?: string;
  };
  pricing?: {
    model: 'free' | 'one-time' | 'subscription' | 'usage';
    amount?: number;
    currency?: string;
  };
}

interface Capability {
  name: string;
  description: string;
  category: SkillCategory;
  tags: string[];
}
```

### 7. Automated Sync Architecture

```
┌─────────────────┐
│  Sync Scheduler │ (Daily/Hourly)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐  ┌─────────┐
│GitHub │  │Moltbook│  │GPT Store│
│API    │  │API    │  │(future) │
└───┬───┘  └───┬────┘  └────┬────┘
    │          │            │
    └──────────┼────────────┘
               │
        ┌──────▼──────┐
        │ Transformer │
        │   Service   │
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   ClawOS    │
        │   Database  │
        └─────────────┘
```

### 8. Quality Control Measures

- **Minimum star threshold** for GitHub repos (10+)
- **Activity check**: Updated within last 6 months
- **Description validation**: Must have meaningful description
- **Deduplication**: Check for existing agents by name/URL
- **Manual review queue**: Flag suspicious agents

### Next Steps

1. Implement GitHub agent crawler (Phase 1)
2. Create agent registration form with metadata extraction
3. Set up scheduled sync jobs
4. Monitor OpenAI API announcements
5. Establish partnerships with agent platforms
