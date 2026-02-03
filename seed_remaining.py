#!/usr/bin/env python3
"""
Continue seeding agents to reach 100 total
Uses proper base58 address generation
"""

import requests
import time
import json
import hashlib
import random
import string

API_URL = "https://clawos.onrender.com/api/agents/register"
VERIFY_URL = "https://clawos.onrender.com/api/agents"

# Base58 alphabet (Bitcoin/Solana style) - excludes 0, O, I, l
BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def generate_base58_address(index: int, length: int = 44) -> str:
    """Generate a deterministic base58 address"""
    # Create deterministic seed from index
    seed = f"neuro_agent_{index:04d}_{int(time.time())}".encode()
    hash_bytes = hashlib.sha256(seed).digest()
    
    # Generate base58 string
    result = []
    remaining = int.from_bytes(hash_bytes, 'big')
    
    while remaining > 0:
        remaining, idx = divmod(remaining, 58)
        result.append(BASE58_ALPHABET[idx])
    
    # Pad or truncate to desired length
    addr = ''.join(reversed(result))
    if len(addr) < length:
        # Pad with deterministic characters
        for i in range(length - len(addr)):
            addr += BASE58_ALPHABET[(index + i) % 58]
    elif len(addr) > length:
        addr = addr[:length]
    
    return addr

# Remaining agents to create (52 more to reach 100)
NAMES = [
    "CognitiveNexus_7", "MindProcessor_Delta", "BrainWave_Infinity", "QuantumSynapse_V8",
    "NeuralGenesis_Pro", "DeepThought_Matrix", "CyberIntellect_X", "AI_Mindscape_3",
    "CortexNetwork_77", "SynapticCore_Prime", "NeuralOptimizer_Bot", "DeepBrain_Apex",
    "ThoughtCluster_V9", "IntellectForge_X", "MindMatrix_Omega", "NeuralHub_Quantum",
    "CognitiveWave_42", "BrainEngine_Supreme", "DeepMind_Forge", "SynapseOptimizer_1",
    "NeuralInterface_X", "AI_Genesis_Core", "QuantumCortex_V5", "CyberNeural_Max",
    "ThoughtNexus_Pro", "IntellectCore_88", "MindWave_Synth", "DeepSynapse_Quantum",
    "NeuralMatrix_X2", "CognitiveBot_Apex", "BrainHub_Infinity", "AI_Cluster_Prime",
    "SynapticForge_7", "DeepIntellect_Matrix", "NeuralOptimizer_V3", "QuantumMind_Nexus",
    "CyberThought_X", "MindEngine_99", "CortexGenesis_Pro", "NeuralWave_Supreme",
    "DeepBrain_Quantum", "ThoughtHub_Omega", "IntellectMatrix_X", "SynapseCore_V8",
    "AI_Neural_Max", "CognitiveForge_42", "BrainNetwork_Prime", "DeepCortex_Infinity",
    "NeuralNexus_7", "QuantumIntellect_X", "MindOptimizer_Pro", "CyberSynapse_V9"
]

DESCRIPTIONS = [
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
    "V9 cyber synapse protector"
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
    print("=" * 60)
    print("Continuing to seed agents to ClawOS Production API")
    print(f"API URL: {API_URL}")
    print("=" * 60)
    print()
    
    # Check current count
    try:
        response = requests.get(VERIFY_URL, timeout=30)
        current_data = response.json()
        current_count = current_data.get('total', len(current_data.get('agents', [])))
        print(f"Current agent count: {current_count}")
        print(f"Target: 100 agents")
        print(f"Need to create: {100 - current_count} more agents")
        print()
    except Exception as e:
        print(f"Could not check current count: {e}")
        current_count = 0
    
    success_count = 0
    error_count = 0
    errors = []
    
    # Process in batches
    batch_size = 10
    num_batches = (len(NAMES) + batch_size - 1) // batch_size
    
    for batch in range(num_batches):
        print(f"--- Batch {batch + 1}/{num_batches} ---")
        
        for i in range(batch_size):
            idx = batch * batch_size + i
            
            if idx >= len(NAMES):
                break
            
            name = NAMES[idx]
            description = DESCRIPTIONS[idx]
            # Generate unique wallet by including current timestamp
            wallet = generate_base58_address(idx + int(time.time() * 1000) % 10000)
            capabilities = generate_capabilities(idx)
            
            payload = {
                "name": name,
                "description": description,
                "capabilities": capabilities,
                "ownerWallet": wallet
            }
            
            print(f"  Registering: {name}")
            
            try:
                response = requests.post(
                    API_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    print(f"    ✓ Success (HTTP {response.status_code})")
                    success_count += 1
                elif response.status_code == 409:
                    print(f"    ⚠ Already exists (HTTP {response.status_code})")
                    # Count as success since agent exists
                    success_count += 1
                else:
                    print(f"    ✗ Failed (HTTP {response.status_code})")
                    print(f"    Response: {response.text[:150]}")
                    error_count += 1
                    errors.append(f"{name}: HTTP {response.status_code}")
            except Exception as e:
                print(f"    ✗ Error: {str(e)[:100]}")
                error_count += 1
                errors.append(f"{name}: {str(e)}")
            
            time.sleep(0.3)
        
        print(f"  Batch progress - Success: {success_count}, Errors: {error_count}")
        print()
        
        if batch < num_batches - 1:
            time.sleep(1)
    
    print("=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print()
    print(f"Results:")
    print(f"  Successfully created/existing: {success_count}")
    print(f"  Errors: {error_count}")
    print()
    
    if errors:
        print("Errors encountered:")
        for err in errors[:10]:
            print(f"  {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
        print()
    
    print("Verifying final agent count...")
    print()
    
    try:
        verify_response = requests.get(VERIFY_URL, timeout=30)
        data = verify_response.json()
        print("API Response:")
        print(json.dumps(data, indent=2)[:2000])
        
        if 'total' in data:
            print(f"\n★ FINAL Total agents in system: {data['total']} ★")
        elif 'agents' in data:
            print(f"\n★ FINAL Total agents in system: {len(data['agents'])} ★")
    except Exception as e:
        print(f"Error verifying: {e}")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
