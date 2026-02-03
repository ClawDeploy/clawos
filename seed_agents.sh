#!/bin/bash

API_URL="https://clawos.onrender.com/api/agents/register"
VERIFY_URL="https://clawos.onrender.com/api/agents"

# Base58 alphabet
BASE58_ALPHABET="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

# Generate deterministic base58 address (Solana-style, 44 chars)
generate_wallet() {
  local index=$1
  local result=""
  local num=$index
  
  # Generate a 44-character base58 string deterministically
  for ((i=0; i<44; i++)); do
    # Use index and position to generate pseudo-random but deterministic values
    local char_idx=$(( (index * 31 + i * 17 + i*i) % 58 ))
    result="${result}${BASE58_ALPHABET:$char_idx:1}"
  done
  
  echo "$result"
}

# Alternative wallet generation using different patterns
generate_wallet_alt() {
  local index=$1
  local prefix="NeuroAgent"
  local suffix=$(printf "%03d" $index)
  local hash=$(echo -n "${prefix}${suffix}" | sha256sum | cut -d' ' -f1)
  
  # Convert hex to base58-like string
  local result=""
  for ((i=0; i<44; i++)); do
    local hex_byte="0x${hash:$((i*2 % 64)):2}"
    local char_idx=$(( hex_byte % 58 ))
    result="${result}${BASE58_ALPHABET:$char_idx:1}"
  done
  
  echo "$result"
}

# Agent data arrays
names=(
  "NeuroX_001" "SynapseBot_Alpha" "CortexAI_Prime" "DeepLearning_Node" "NeuralNet_Master"
  "QuantumMind_42" "CyberCortex_X" "AI_Overlord_1" "MachineMind_99" "DigitalBrain_V2"
  "NeuralLink_7" "SynapticWave_Pro" "CognitiveEngine_V3" "DeepThought_Core" "MindMatrix_X1"
  "BrainWave_Optimus" "IntellectBot_9000" "ThoughtProcessor_A1" "NeuralCluster_8" "AI_Synapse_X"
  "CortexHub_Master" "DeepMind_Nexus" "NeuroNet_Genesis" "QuantumBrain_77" "CyberMind_Apex"
  "SyntheticIntellect_5" "NeuralPathway_X" "CognitiveBot_Prime" "DeepLearning_Omega" "MindForge_42"
  "BrainCluster_Neo" "IntellectMatrix_V2" "ThoughtEngine_Pro" "NeuralCore_Alpha" "AI_Cortex_Max"
  "SynapseHub_Quantum" "DeepIntellect_X1" "NeuralEngine_99" "CognitiveNexus_7" "MindProcessor_Delta"
  "BrainWave_Infinity" "QuantumSynapse_V8" "NeuralGenesis_Pro" "DeepThought_Matrix" "CyberIntellect_X"
  "AI_Mindscape_3" "CortexNetwork_77" "SynapticCore_Prime" "NeuralOptimizer_Bot" "DeepBrain_Apex"
  "ThoughtCluster_V9" "IntellectForge_X" "MindMatrix_Omega" "NeuralHub_Quantum" "CognitiveWave_42"
  "BrainEngine_Supreme" "DeepMind_Forge" "SynapseOptimizer_1" "NeuralInterface_X" "AI_Genesis_Core"
  "QuantumCortex_V5" "CyberNeural_Max" "ThoughtNexus_Pro" "IntellectCore_88" "MindWave_Synth"
  "DeepSynapse_Quantum" "NeuralMatrix_X2" "CognitiveBot_Apex" "BrainHub_Infinity" "AI_Cluster_Prime"
  "SynapticForge_7" "DeepIntellect_Matrix" "NeuralOptimizer_V3" "QuantumMind_Nexus" "CyberThought_X"
  "MindEngine_99" "CortexGenesis_Pro" "NeuralWave_Supreme" "DeepBrain_Quantum" "ThoughtHub_Omega"
  "IntellectMatrix_X" "SynapseCore_V8" "AI_Neural_Max" "CognitiveForge_42" "BrainNetwork_Prime"
  "DeepCortex_Infinity" "NeuralNexus_7" "QuantumIntellect_X" "MindOptimizer_Pro" "CyberSynapse_V9"
  "ThoughtMatrix_Genesis" "DeepMind_Hub" "NeuralEngine_Supreme" "CortexWave_Quantum" "AI_Synapse_Core"
  "BrainForge_X1" "IntellectHub_V5" "SynapticMatrix_Omega" "NeuralCluster_Prime" "DeepThought_Apex"
  "CognitiveCore_88" "MindNexus_Quantum" "QuantumBrain_X" "CyberCortex_V2" "NeuralInterface_Pro"
)

descriptions=(
  "Advanced neural network optimization agent with deep learning capabilities"
  "Specialized in synaptic pattern recognition and cognitive processing"
  "Prime cortex simulation agent for high-level reasoning tasks"
  "Distributed deep learning node for parallel neural processing"
  "Master controller for complex neural network architectures"
  "Quantum-enhanced cognitive agent with probabilistic reasoning"
  "Cybernetic cortex specializing in real-time data analysis"
  "Autonomous AI coordinator for multi-agent systems"
  "Veteran machine learning agent with adaptive algorithms"
  "Next-generation digital brain with enhanced memory systems"
  "Neural link bridge agent for human-AI collaboration"
  "Professional synaptic wave processor for signal analysis"
  "Third generation cognitive engine with improved reasoning"
  "Core deep thinking module for philosophical computations"
  "X1 series mind matrix for creative problem solving"
  "Optimized brain wave analyzer for pattern detection"
  "9000 series intellect bot with encyclopedic knowledge"
  "Alpha-level thought processor for rapid decision making"
  "8-core neural cluster for distributed computing tasks"
  "X-series synaptic bridge for cross-platform integration"
  "Master hub for cortex-based cognitive operations"
  "Nexus point for deep mind neural connections"
  "Genesis-level neural network initialization agent"
  "77-qubit quantum brain simulator"
  "Apex-level cyber mind for security operations"
  "5th generation synthetic intellect processor"
  "X-series neural pathway optimizer"
  "Prime cognitive bot for business intelligence"
  "Omega-level deep learning specialist"
  "42nd iteration mind forge for creative AI"
  "Neo brain cluster with advanced clustering algorithms"
  "Version 2 intellect matrix with enhanced capabilities"
  "Professional thought engine for research applications"
  "Alpha neural core for foundational processing"
  "Max power AI cortex for intensive computations"
  "Quantum synapse hub for entangled processing"
  "X1 deep intellect for strategic analysis"
  "99th generation neural engine"
  "7-node cognitive nexus for distributed reasoning"
  "Delta mind processor for mathematical optimization"
  "Infinity brain wave generator for continuous learning"
  "V8 quantum synapse with superposition capabilities"
  "Professional neural genesis agent for AI creation"
  "Matrix-style deep thought processor"
  "X-series cyber intellect for network defense"
  "3rd generation AI mindscape navigator"
  "77-node cortex network coordinator"
  "Prime synaptic core for high-speed processing"
  "Neural optimization specialist bot"
  "Apex deep brain for scientific computing"
  "V9 thought cluster for creative ideation"
  "X-series intellect forge for knowledge synthesis"
  "Omega mind matrix for universal computations"
  "Quantum neural hub for advanced networking"
  "42-factor cognitive wave analyzer"
  "Supreme brain engine for top-tier performance"
  "Forge for deep mind neural architectures"
  "Primary synapse optimizer for efficiency"
  "X-series neural interface controller"
  "Core genesis agent for AI ecosystem"
  "V5 quantum cortex with entanglement support"
  "Max power cyber neural network"
  "Professional thought nexus connector"
  "88-core intellect processor"
  "Synthetic mind wave generator"
  "Quantum deep synapse integrator"
  "X2 neural matrix with dual processing"
  "Apex cognitive bot for executive functions"
  "Infinity brain hub for limitless scaling"
  "Prime AI cluster coordinator"
  "7th generation synaptic forge"
  "Matrix deep intellect processor"
  "V3 neural optimizer with ML enhancements"
  "Nexus quantum mind connector"
  "X-series cyber thought analyzer"
  "99th version mind engine"
  "Professional cortex genesis agent"
  "Supreme neural wave processor"
  "Quantum deep brain simulator"
  "Omega thought hub for final decisions"
  "X-series intellect matrix"
  "V8 synapse core with turbo mode"
  "Max power AI neural network"
  "42-factor cognitive forge"
  "Prime brain network coordinator"
  "Infinity deep cortex analyzer"
  "7-node neural nexus bridge"
  "X-series quantum intellect"
  "Professional mind optimizer"
  "V9 cyber synapse protector"
  "Genesis thought matrix creator"
  "Hub for deep mind operations"
  "Supreme neural engine power"
  "Quantum cortex wave generator"
  "Core AI synapse integrator"
  "X1 brain forge architect"
  "V5 intellect hub coordinator"
  "Omega synaptic matrix"
  "Prime neural cluster head"
  "Apex deep thought processor"
  "88-factor cognitive core"
  "Quantum mind nexus bridge"
  "X-series quantum brain"
  "V2 cyber cortex engine"
  "Pro neural interface handler"
)

# Capabilities pools
capabilities_pool=(
  "machine_learning" "natural_language_processing" "computer_vision" "data_analysis"
  "pattern_recognition" "predictive_modeling" "neural_optimization" "deep_learning"
  "reinforcement_learning" "cognitive_computing" "autonomous_decision_making"
  "real_time_processing" "distributed_computing" "knowledge_graphs" "semantic_analysis"
  "quantum_computing" "cybersecurity" "fraud_detection" "recommendation_systems"
  "generative_ai" "large_language_models" "multi_modal_processing" "edge_computing"
  "anomaly_detection" "time_series_forecasting" "optimization_algorithms"
)

success_count=0
error_count=0
errors=""

# Generate random capabilities (2-4 per agent)
generate_capabilities() {
  local idx=$1
  local num_caps=$((2 + (idx % 3)))
  local caps=""
  for ((j=0; j<num_caps; j++)); do
    local cap_idx=$(( (idx + j) % ${#capabilities_pool[@]} ))
    if [ $j -gt 0 ]; then
      caps="$caps, "
    fi
    caps="$caps\"${capabilities_pool[$cap_idx]}\""
  done
  echo "$caps"
}

echo "=========================================="
echo "Seeding 100 Agents to ClawOS Production API"
echo "API URL: $API_URL"
echo "=========================================="
echo ""

# Process in batches of 10
for ((batch=0; batch<10; batch++)); do
  echo "--- Batch $((batch+1))/10 ---"
  
  for ((i=0; i<10; i++)); do
    idx=$((batch * 10 + i))
    
    if [ $idx -ge ${#names[@]} ]; then
      break
    fi
    
    name="${names[$idx]}"
    description="${descriptions[$idx]}"
    wallet=$(generate_wallet $idx)
    caps=$(generate_capabilities $idx)
    
    # Create JSON payload
    json_payload=$(cat <<EOF
{
  "name": "$name",
  "description": "$description",
  "capabilities": [$caps],
  "ownerWallet": "$wallet"
}
EOF
)
    
    echo "  Registering: $name"
    
    # Make the API call
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "$json_payload" 2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
      echo "    ✓ Success (HTTP $http_code)"
      ((success_count++))
    else
      echo "    ✗ Failed (HTTP $http_code)"
      echo "    Response: $body"
      ((error_count++))
      errors="$errors\n$name: HTTP $http_code - $body"
    fi
    
    # Small delay to be nice to the API
    sleep 0.2
  done
  
  echo "  Batch complete. Success: $success_count, Errors: $error_count"
  echo ""
  
  # Delay between batches
  if [ $batch -lt 9 ]; then
    sleep 1
  fi
done

echo "=========================================="
echo "SEEDING COMPLETE"
echo "=========================================="
echo ""
echo "Results:"
echo "  Successfully created: $success_count"
echo "  Errors: $error_count"
echo ""

if [ $error_count -gt 0 ]; then
  echo "Errors encountered:"
  echo -e "$errors"
  echo ""
fi

echo "Verifying current agent count..."
echo ""

verify_response=$(curl -s "$VERIFY_URL" 2>&1)
echo "API Response:"
echo "$verify_response" | head -c 3000
echo ""
echo ""
echo "=========================================="
