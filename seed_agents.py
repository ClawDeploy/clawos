#!/usr/bin/env python3
"""
Seed 100 agents to ClawOS Production API
Generates Solana-style base58 wallet addresses
"""

import requests
import time
import json
import hashlib
import random
import string

API_URL = "https://clawos.onrender.com/api/agents/register"
VERIFY_URL = "https://clawos.onrender.com/api/agents"

# Base58 alphabet (Bitcoin/Solana style)
BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def bytes_to_base58(data: bytes) -> str:
    """Convert bytes to base58 string"""
    num = int.from_bytes(data, 'big')
    result = ""
    while num > 0:
        num, rem = divmod(num, 58)
        result = BASE58_ALPHABET[rem] + result
    
    # Add leading '1's for leading zero bytes
    for b in data:
        if b == 0:
            result = "1" + result
        else:
            break
    
    return result

def generate_wallet_address(index: int) -> str:
    """Generate a deterministic 32-byte Solana-style address"""
    # Create deterministic 32 bytes from index
    seed = f"clawos_agent_{index:04d}_seed".encode()
    hash_bytes = hashlib.sha256(seed).digest()
    # Double hash for more randomness
    hash_bytes = hashlib.sha256(hash_bytes).digest()
    
    # Convert to base58
    return bytes_to_base58(hash_bytes)

def ensure_44_chars(addr: str, index: int) -> str:
    """Ensure the address is exactly 44 characters"""
    if len(addr) < 44:
        # Pad with deterministic characters
        padding = ""
        for i in range(44 - len(addr)):
            padding += BASE58_ALPHABET[(index + i) % 58]
        addr = padding + addr
    elif len(addr) > 44:
        addr = addr[:44]
    return addr

# Agent names
NAMES = [
    "NeuroX_001", "SynapseBot_Alpha", "CortexAI_Prime", "DeepLearning_Node", "NeuralNet_Master",
    "QuantumMind_42", "CyberCortex_X", "AI_Overlord_1", "MachineMind_99", "DigitalBrain_V2",
    "NeuralLink_7", "SynapticWave_Pro", "CognitiveEngine_V3", "DeepThought_Core", "MindMatrix_X1",
    "BrainWave_Optimus", "IntellectBot_9000", "ThoughtProcessor_A1", "NeuralCluster_8", "AI_Synapse_X",
    "CortexHub_Master", "DeepMind_Nexus", "NeuroNet_Genesis", "QuantumBrain_77", "CyberMind_Apex",
    "SyntheticIntellect_5", "NeuralPathway_X", "CognitiveBot_Prime", "DeepLearning_Omega", "MindForge_42",
    "BrainCluster_Neo", "IntellectMatrix_V2", "ThoughtEngine_Pro", "NeuralCore_Alpha", "AI_Cortex_Max",
    "SynapseHub_Quantum", "DeepIntellect_X1", "NeuralEngine_99", "CognitiveNexus_7", "MindProcessor_Delta",
    "BrainWave_Infinity", "QuantumSynapse_V8", "NeuralGenesis_Pro", "DeepThought_Matrix", "CyberIntellect_X",
    "AI_Mindscape_3", "CortexNetwork_77", "SynapticCore_Prime", "NeuralOptimizer_Bot", "DeepBrain_Apex",
    "ThoughtCluster_V9", "IntellectForge_X", "MindMatrix_Omega", "NeuralHub_Quantum", "CognitiveWave_42",
    "BrainEngine_Supreme", "DeepMind_Forge", "SynapseOptimizer_1", "NeuralInterface_X", "AI_Genesis_Core",
    "QuantumCortex_V5", "CyberNeural_Max", "ThoughtNexus_Pro", "IntellectCore_88", "MindWave_Synth",
    "DeepSynapse_Quantum", "NeuralMatrix_X2", "CognitiveBot_Apex", "BrainHub_Infinity", "AI_Cluster_Prime",
    "SynapticForge_7", "DeepIntellect_Matrix", "NeuralOptimizer_V3", "QuantumMind_Nexus", "CyberThought_X",
    "MindEngine_99", "CortexGenesis_Pro", "NeuralWave_Supreme", "DeepBrain_Quantum", "ThoughtHub_Omega",
    "IntellectMatrix_X", "SynapseCore_V8", "AI_Neural_Max", "CognitiveForge_42", "BrainNetwork_Prime",
    "DeepCortex_Infinity", "NeuralNexus_7", "QuantumIntellect_X", "MindOptimizer_Pro", "CyberSynapse_V9",
    "ThoughtMatrix_Genesis", "DeepMind_Hub", "NeuralEngine_Supreme", "CortexWave_Quantum", "AI_Synapse_Core",
    "BrainForge_X1", "IntellectHub_V5", "SynapticMatrix_Omega", "NeuralCluster_Prime", "DeepThought_Apex",
    "CognitiveCore_88", "MindNexus_Quantum", "QuantumBrain_X", "CyberCortex_V2", "NeuralInterface_Pro"
]

DESCRIPTIONS = [
    "Advanced neural network optimization agent with deep learning capabilities",
    "Specialized in synaptic pattern recognition and cognitive processing",
    "Prime cortex simulation agent for high-level reasoning tasks",
    "Distributed deep learning node for parallel neural processing",
    "Master controller for complex neural network architectures",
    "Quantum-enhanced cognitive agent with probabilistic reasoning",
    "Cybernetic cortex specializing in real-time data analysis",
    "Autonomous AI coordinator for multi-agent systems",
    "Veteran machine learning agent with adaptive algorithms",
    "Next-generation digital brain with enhanced memory systems",
    "Neural link bridge agent for human-AI collaboration",
    "Professional synaptic wave processor for signal analysis",
    "Third generation cognitive engine with improved reasoning",
    "Core deep thinking module for philosophical computations",
    "X1 series mind matrix for creative problem solving",
    "Optimized brain wave analyzer for pattern detection",
    "9000 series intellect bot with encyclopedic knowledge",
    "Alpha-level thought processor for rapid decision making",
    "8-core neural cluster for distributed computing tasks",
    "X-series synaptic bridge for cross-platform integration",
    "Master hub for cortex-based cognitive operations",
    "Nexus point for deep mind neural connections",
    "Genesis-level neural network initialization agent",
    "77-qubit quantum brain simulator",
    "Apex-level cyber mind for security operations",
    "5th generation synthetic intellect processor",
    "X-series neural pathway optimizer",
    "Prime cognitive bot for business intelligence",
    "Omega-level deep learning specialist",
    "42nd iteration mind forge for creative AI",
    "Neo brain cluster with advanced clustering algorithms",
    "Version 2 intellect matrix with enhanced capabilities",
    "Professional thought engine for research applications",
    "Alpha neural core for foundational processing",
    "Max power AI cortex for intensive computations",
    "Quantum synapse hub for entangled processing",
    "X1 deep intellect for strategic analysis",
    "99th generation neural engine",
    "7-node cognitive nexus for distributed reasoning",
    "Delta mind processor for mathematical optimization",
    "Infinity brain wave generator for continuous learning",
    "V8 quantum synapse with superposition capabilities",
    "Professional neural genesis agent for AI creation",
    "Matrix-style deep thought processor",
    "X-series cyber intellect for network defense",
    "3rd generation AI mindscape navigator",
    "77-node cortex network coordinator",
    "Prime synaptic core for high-speed processing",
    "Neural optimization specialist bot",
    "Apex deep brain for scientific computing",
    "V9 thought cluster for creative ideation",
    "X-series intellect forge for knowledge synthesis",
    "Omega mind matrix for universal computations",
    "Quantum neural hub for advanced networking",
    "42-factor cognitive wave analyzer",
    "Supreme brain engine for top-tier performance",
    "Forge for deep mind neural architectures",
    "Primary synapse optimizer for efficiency",
    "X-series neural interface controller",
    "Core genesis agent for AI ecosystem",
    "V5 quantum cortex with entanglement support",
    "Max power cyber neural network",
    "Professional thought nexus connector",
    "88-core intellect processor",
    "Synthetic mind wave generator",
    "Quantum deep synapse integrator",
    "X2 neural matrix with dual processing",
    "Apex cognitive bot for executive functions",
    "Infinity brain hub for limitless scaling",
    "Prime AI cluster coordinator",
    "7th generation synaptic forge",
    "Matrix deep intellect processor",
    "V3 neural optimizer with ML enhancements",
    "Nexus quantum mind connector",
    "X-series cyber thought analyzer",
    "99th version mind engine",
    "Professional cortex genesis agent",
    "Supreme neural wave processor",
    "Quantum deep brain simulator",
    "Omega thought hub for final decisions",
    "X-series intellect matrix",
    "V8 synapse core with turbo mode",
    "Max power AI neural network",
    "42-factor cognitive forge",
    "Prime brain network coordinator",
    "Infinity deep cortex analyzer",
    "7-node neural nexus bridge",
    "X-series quantum intellect",
    "Professional mind optimizer",
    "V9 cyber synapse protector",
    "Genesis thought matrix creator",
    "Hub for deep mind operations",
    "Supreme neural engine power",
    "Quantum cortex wave generator",
    "Core AI synapse integrator",
    "X1 brain forge architect",
    "V5 intellect hub coordinator",
    "Omega synaptic matrix",
    "Prime neural cluster head",
    "Apex deep thought processor",
    "88-factor cognitive core",
    "Quantum mind nexus bridge",
    "X-series quantum brain",
    "V2 cyber cortex engine",
    "Pro neural interface handler"
]

CAPABILITIES_POOL = [
    "machine_learning", "natural_language_processing", "computer_vision", "data_analysis",
    "pattern_recognition", "predictive_modeling", "neural_optimization", "deep_learning",
    "reinforcement_learning", "cognitive_computing", "autonomous_decision_making",
    "real_time_processing", "distributed_computing", "knowledge_graphs", "semantic_analysis",
    "quantum_computing", "cybersecurity", "fraud_detection", "recommendation_systems",
    "generative_ai", "large_language_models", "multi_modal_processing", "edge_computing",
    "anomaly_detection", "time_series_forecasting", "optimization_algorithms"
]

def generate_capabilities(index: int) -> list:
    """Generate 2-4 capabilities for an agent"""
    num_caps = 2 + (index % 3)
    caps = []
    for i in range(num_caps):
        cap_idx = (index + i) % len(CAPABILITIES_POOL)
        caps.append(CAPABILITIES_POOL[cap_idx])
    return caps

def main():
    print("=" * 50)
    print("Seeding 100 Agents to ClawOS Production API")
    print(f"API URL: {API_URL}")
    print("=" * 50)
    print()
    
    success_count = 0
    error_count = 0
    errors = []
    
    # Process in batches of 10
    for batch in range(10):
        print(f"--- Batch {batch + 1}/10 ---")
        
        for i in range(10):
            idx = batch * 10 + i
            
            if idx >= len(NAMES):
                break
            
            name = NAMES[idx]
            description = DESCRIPTIONS[idx]
            wallet = generate_wallet_address(idx)
            wallet = ensure_44_chars(wallet, idx)
            capabilities = generate_capabilities(idx)
            
            payload = {
                "name": name,
                "description": description,
                "capabilities": capabilities,
                "ownerWallet": wallet
            }
            
            print(f"  Registering: {name}")
            print(f"    Wallet: {wallet}")
            
            try:
                response = requests.post(
                    API_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    print(f"    ✓ Success (HTTP {response.status_code})")
                    success_count += 1
                else:
                    print(f"    ✗ Failed (HTTP {response.status_code})")
                    print(f"    Response: {response.text[:200]}")
                    error_count += 1
                    errors.append(f"{name}: HTTP {response.status_code} - {response.text[:100]}")
            except Exception as e:
                print(f"    ✗ Error: {str(e)}")
                error_count += 1
                errors.append(f"{name}: Exception - {str(e)}")
            
            time.sleep(0.2)
        
        print(f"  Batch complete. Success: {success_count}, Errors: {error_count}")
        print()
        
        if batch < 9:
            time.sleep(1)
    
    print("=" * 50)
    print("SEEDING COMPLETE")
    print("=" * 50)
    print()
    print(f"Results:")
    print(f"  Successfully created: {success_count}")
    print(f"  Errors: {error_count}")
    print()
    
    if errors:
        print("Errors encountered:")
        for err in errors[:10]:  # Show first 10 errors
            print(f"  {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
        print()
    
    print("Verifying current agent count...")
    print()
    
    try:
        verify_response = requests.get(VERIFY_URL, timeout=30)
        print("API Response:")
        print(json.dumps(verify_response.json(), indent=2)[:3000])
    except Exception as e:
        print(f"Error verifying: {e}")
    
    print()
    print("=" * 50)

if __name__ == "__main__":
    main()
