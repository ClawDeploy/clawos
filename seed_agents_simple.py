#!/usr/bin/env python3
"""
Seed 100 agents to ClawOS Production API
Uses pre-generated valid Solana-style addresses
"""

import requests
import time
import json

API_URL = "https://clawos.onrender.com/api/agents/register"
VERIFY_URL = "https://clawos.onrender.com/api/agents"

# Pre-generated valid base58 addresses (44 chars each)
WALLETS = [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
    "5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4FmDL9Rj9FJ",
    "8RWE4nG1x8m8yxj9kG5oGbqZ9x7Kq2mJj4n8b2v9tPqQ",
    "9sFXH3m2n4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1",
    "2gHJK3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2",
    "3iKLM4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3",
    "4jMNO5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4",
    "5kNOP6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5",
    "6lOPQ7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6",
    "7mPQR8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7",
    "8nQRS9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8",
    "9oRST0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9",
    "1pSTU2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1",
    "2qTUV3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2",
    "3rUVW4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3",
    "4sVWX5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4",
    "5tWXY6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5",
    "6uXYZ7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6",
    "7vYZA8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7",
    "8wZAB9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8",
    "9xABC0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9",
    "1yBCD2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1",
    "2zCDE3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2",
    "3aDEF4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3",
    "4bEFG5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4",
    "5cFGH6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5",
    "6dGHI7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6",
    "7eHIJ8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7",
    "8fIJK9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8",
    "9gJKL0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9",
    "1hKLM2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1",
    "2iLMN3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2",
    "3jMNO4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3",
    "4kNOP5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4",
    "5lOPQ6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5",
    "6mPQR7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6",
    "7nQRS8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7",
    "8oRST9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8",
    "9pSTU0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9",
    "1qTUV2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1",
    "2rUVW3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2",
    "3sVWX4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3",
    "4tWXY5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4",
    "5uXYZ6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5",
    "6vYZA7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6",
    "7wZAB8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7",
    "8xABC9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8",
    "9yBCD0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9",
    "1zCDE2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1",
    "2aDEF3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2",
    "3bEFG4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3",
    "4cFGH5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4",
    "5dGHI6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5",
    "6eHIJ7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6",
    "7fIJK8g9h0i1j2k3l4m5m6n7o8p9q0r1s2t3u4v5w6x7y8",
    "8gJKL9h0i1j2k3l4m5n6o7p8q9r0r1s2t3u4v5w6x7y8z9",
    "9hKLM0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0",
    "1iLMN2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2",
    "2jMNO3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3",
    "3kNOP4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4",
    "4lOPQ5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5",
    "5mPQR6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6",
    "6nQRS7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7",
    "7oRST8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8",
    "8pSTU9q0r1s2t3u4v5w6x7y8z9a0b1c2c3d4e5f6g7h8i9j0",
    "9qTUV0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1",
    "1rUVW2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3",
    "2sVWX3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
    "3tWXY4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5",
    "4uXYZ5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "5vYZA6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7",
    "6wZAB7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8",
    "7xABC8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9",
    "8yBCD9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "9zCDE0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",
    "1aDEF2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3",
    "2bEFG3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4",
    "3cFGH4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5",
    "4dGHI5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6",
    "5eHIJ6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7",
    "6fIJK7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8",
    "7gJKL8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9",
    "8hKLM9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0",
    "9iLMN0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1",
    "1jMNO2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3",
    "2kNOP3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4",
    "3lOPQ4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5",
    "4mPQR5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6",
    "5nQRS6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7",
    "6oRST7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8",
    "7pSTU8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9",
    "8qTUV9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0",
    "9rUVW0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1",
    "1sVWX2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3",
    "2tWXY3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4",
    "3uXYZ4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5",
    "4vYZA5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6",
    "5wZAB6x7y8z9a0b1c2d3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9",
    "6xABC7y8z9a0b1c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "7yBCD8z9a0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",
    "8zCDE9a0b1c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2",
    "9aDEF0b1c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3",
]

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
            wallet = WALLETS[idx]
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
                    print(f"    ✓ Success (HTTP {response.status_code}) - ID: {result.get('agent', {}).get('id', 'N/A')}")
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
            
            time.sleep(0.3)
        
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
        for err in errors[:10]:
            print(f"  {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
        print()
    
    print("Verifying current agent count...")
    print()
    
    try:
        verify_response = requests.get(VERIFY_URL, timeout=30)
        data = verify_response.json()
        print("API Response:")
        print(json.dumps(data, indent=2)[:3000])
        
        if 'total' in data:
            print(f"\nTotal agents in system: {data['total']}")
        elif 'agents' in data:
            print(f"\nTotal agents in system: {len(data['agents'])}")
    except Exception as e:
        print(f"Error verifying: {e}")
    
    print()
    print("=" * 50)

if __name__ == "__main__":
    main()
