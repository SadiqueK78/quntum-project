from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
import numpy as np
from typing import List, Dict, Any
import logging
import os
import requests as http_requests

# Setup
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional, env vars can be set directly

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Quantum circuit builder and simulator
class QuantumCircuitBuilder:
    """Helper class to build and simulate quantum circuits"""
    
    @staticmethod
    def build_circuit(qubits: int, gates: List[Dict[str, Any]]) -> QuantumCircuit:
        """
        Build a quantum circuit from a list of gates
        
        Args:
            qubits: Number of qubits
            gates: List of gate dictionaries with structure:
                {
                    "type": "H" | "X" | "Y" | "Z" | "CNOT" | "Measure",
                    "target": qubit_index,
                    "control": control_qubit_index (for CNOT),
                    "step": time_step
                }
        
        Returns:
            QuantumCircuit object
        """
        qc = QuantumCircuit(qubits, qubits)
        
        # Sort gates by step to apply them in order
        sorted_gates = sorted(gates, key=lambda g: g.get('step', 0))
        
        for gate in sorted_gates:
            gate_type = gate.get('type', '').upper()
            target = gate.get('target', 0)
            
            try:
                if gate_type == 'H':
                    qc.h(target)
                elif gate_type == 'X':
                    qc.x(target)
                elif gate_type == 'Z':
                    qc.z(target)
                elif gate_type == 'Y':
                    qc.y(target)
                elif gate_type == 'I':
                    qc.id(target)
                elif gate_type == 'S':
                    qc.s(target)
                elif gate_type == 'SDG':
                    qc.sdg(target)
                elif gate_type == 'T':
                    qc.t(target)
                elif gate_type == 'TDG':
                    qc.tdg(target)
                elif gate_type == 'SX':
                    qc.sx(target)
                elif gate_type == 'SXDG':
                    qc.sxdg(target)
                elif gate_type == 'RX':
                    theta = float(gate.get('theta', np.pi / 2))
                    qc.rx(theta, target)
                elif gate_type == 'RY':
                    theta = float(gate.get('theta', np.pi / 2))
                    qc.ry(theta, target)
                elif gate_type == 'RZ':
                    theta = float(gate.get('theta', np.pi / 2))
                    qc.rz(theta, target)
                elif gate_type == 'P':
                    theta = float(gate.get('theta', np.pi / 2))
                    qc.p(theta, target)
                elif gate_type == 'CNOT':
                    control = gate.get('control', 0)
                    qc.cx(control, target)
                elif gate_type == 'CCNOT' or gate_type == 'TOFFOLI':
                    control = gate.get('control', 0)
                    control2 = gate.get('control2', 1)
                    qc.ccx(control, control2, target)
                elif gate_type == 'SWAP':
                    swap_with = gate.get('swap_with')
                    if swap_with is None:
                        raise ValueError('SWAP requires swap_with qubit index')
                    qc.swap(target, int(swap_with))
                elif gate_type == 'BARRIER' or gate_type == '|':
                    if gate.get('target') is None:
                        qc.barrier()
                    else:
                        qc.barrier(target)
                elif gate_type == 'RESET':
                    qc.reset(target)
                elif gate_type == 'MEASURE':
                    pass  # Measurement will be added after all gates
                else:
                    logger.warning(f"Unknown gate type: {gate_type}")
            except Exception as e:
                logger.error(f"Error applying gate {gate_type}: {e}")
                raise ValueError(f"Invalid gate configuration: {e}")
        
        # Add measurements
        qc.measure(range(qubits), range(qubits))
        
        return qc
    
    @staticmethod
    def simulate(qc: QuantumCircuit, shots: int = 1024) -> Dict[str, Any]:
        """
        Simulate the quantum circuit
        
        Args:
            qc: QuantumCircuit to simulate
            shots: Number of measurement shots
        
        Returns:
            Dictionary with simulation results
        """
        try:
            # Create a circuit copy for statevector (without measurements)
            qc_statevector = qc.copy()
            qc_statevector.remove_final_measurements(inplace=True)
            # Save the statevector as the final instruction
            qc_statevector.save_statevector()
            
            # Simulate statevector
            simulator_sv = AerSimulator(method='statevector')
            job_sv = simulator_sv.run(qc_statevector)
            result_sv = job_sv.result()
            
            # Get statevector
            try:
                statevector_data = result_sv.get_statevector(0).data
            except:
                # Fallback if indexing doesn't work
                statevector_data = result_sv.data(0)['statevector']
            
            # Simulate measurement probabilities using automatic method
            simulator_qasm = AerSimulator(method='automatic')
            job_qasm = simulator_qasm.run(qc, shots=shots)
            result_qasm = job_qasm.result()
            counts = result_qasm.get_counts(0)
            
            # Exact probabilities from statevector (deterministic and ideal)
            num_qubits = qc.num_qubits
            probabilities = {}
            for idx, amp in enumerate(statevector_data):
                prob = float((amp.real * amp.real) + (amp.imag * amp.imag))
                if prob > 1e-12:
                    bitstring = format(idx, f'0{num_qubits}b')
                    probabilities[bitstring] = prob

            # Keep sampled probabilities as additional debug output.
            sampled_probabilities = {
                bitstring: count / shots for bitstring, count in counts.items()
            }
            
            return {
                'success': True,
                'statevector': [
                    {'real': float(v.real), 'imag': float(v.imag)} 
                    for v in statevector_data
                ],
                'probabilities': probabilities,
                'sampled_probabilities': sampled_probabilities,
                'counts': counts,
                'num_qubits': qc.num_qubits,
            }
        except Exception as e:
            logger.error(f"Simulation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'quantum-simulator'})


@app.route('/simulate', methods=['POST'])
def simulate_circuit():
    """
    Main endpoint for circuit simulation
    
    Expected JSON body:
    {
        "qubits": 2,
        "gates": [
            {"type": "H", "target": 0, "step": 0},
            {"type": "CNOT", "control": 0, "target": 1, "step": 1}
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        qubits = data.get('qubits', 2)
        gates = data.get('gates', [])
        shots = data.get('shots', 1024)
        
        # Validation
        if qubits < 1 or qubits > 10:
            return jsonify({'error': 'Qubits must be between 1 and 10'}), 400
        
        if not isinstance(gates, list):
            return jsonify({'error': 'Gates must be a list'}), 400
        
        logger.info(f"Building circuit with {qubits} qubits and {len(gates)} gates")
        
        # Build circuit
        qc = QuantumCircuitBuilder.build_circuit(qubits, gates)
        
        # Simulate
        result = QuantumCircuitBuilder.simulate(qc, shots=shots)
        
        if not result['success']:
            return jsonify({'error': result.get('error', 'Simulation failed')}), 500
        
        return jsonify(result), 200
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/gates', methods=['GET'])
def get_available_gates():
    """Return available gates"""
    gates = [
        {
            'type': 'H',
            'name': 'Hadamard',
            'description': 'Creates superposition',
            'qubits_required': 1
        },
        {
            'type': 'X',
            'name': 'Pauli X',
            'description': 'Quantum NOT gate',
            'qubits_required': 1
        },
        {
            'type': 'I',
            'name': 'Identity',
            'description': 'Identity gate',
            'qubits_required': 1
        },
        {
            'type': 'Y',
            'name': 'Pauli Y',
            'description': 'Rotation around Y-axis',
            'qubits_required': 1
        },
        {
            'type': 'Z',
            'name': 'Pauli Z',
            'description': 'Rotation around Z-axis',
            'qubits_required': 1
        },
        {
            'type': 'S',
            'name': 'S',
            'description': 'Phase gate S',
            'qubits_required': 1
        },
        {
            'type': 'Sdg',
            'name': 'S dagger',
            'description': 'S dagger gate',
            'qubits_required': 1
        },
        {
            'type': 'T',
            'name': 'T',
            'description': 'T gate',
            'qubits_required': 1
        },
        {
            'type': 'Tdg',
            'name': 'T dagger',
            'description': 'T dagger gate',
            'qubits_required': 1
        },
        {
            'type': 'SX',
            'name': 'Sqrt X',
            'description': 'Square-root X gate',
            'qubits_required': 1
        },
        {
            'type': 'SXdg',
            'name': 'Sqrt X dagger',
            'description': 'Square-root X dagger gate',
            'qubits_required': 1
        },
        {
            'type': 'RX',
            'name': 'RX(theta)',
            'description': 'X-axis rotation gate',
            'qubits_required': 1
        },
        {
            'type': 'RY',
            'name': 'RY(theta)',
            'description': 'Y-axis rotation gate',
            'qubits_required': 1
        },
        {
            'type': 'RZ',
            'name': 'RZ(theta)',
            'description': 'Z-axis rotation gate',
            'qubits_required': 1
        },
        {
            'type': 'P',
            'name': 'P(theta)',
            'description': 'Phase rotation gate',
            'qubits_required': 1
        },
        {
            'type': 'CNOT',
            'name': 'CNOT',
            'description': 'Controlled NOT gate',
            'qubits_required': 2
        },
        {
            'type': 'CCNOT',
            'name': 'CCNOT (Toffoli)',
            'description': 'Double-controlled NOT gate',
            'qubits_required': 3
        },
        {
            'type': 'SWAP',
            'name': 'SWAP',
            'description': 'Swap states of two qubits',
            'qubits_required': 2
        },
        {
            'type': 'Measure',
            'name': 'Measurement',
            'description': 'Measure qubit state',
            'qubits_required': 1
        },
        {
            'type': 'Reset',
            'name': 'Reset',
            'description': 'Reset qubit to |0>',
            'qubits_required': 1
        },
        {
            'type': 'Barrier',
            'name': 'Barrier |',
            'description': 'Circuit barrier separator',
            'qubits_required': 1
        },
    ]
    return jsonify(gates), 200


@app.route('/ai-explain', methods=['POST'])
def ai_explain():
    """
    AI explanation endpoint — proxies requests to OpenRouter API.
    Keeps the API key securely on the server.

    Expected JSON body:
    {
        "prompt": "User prompt text",
        "model": "openai/gpt-4o-mini"  (optional)
    }
    """
    try:
        data = request.get_json()
        if not data or not data.get('prompt'):
            return jsonify({'error': 'No prompt provided'}), 400

        api_key = os.environ.get('OPENROUTER_API_KEY', '')
        if not api_key:
            return jsonify({
                'error': 'OpenRouter API key not configured. '
                         'Set OPENROUTER_API_KEY in backend .env file.'
            }), 503

        model = data.get('model', 'openai/gpt-4o-mini')
        user_prompt = data['prompt']

        system_prompt = (
            'You are a quantum computing tutor designed for beginners. '
            'Follow these rules strictly:\n'
            '1. **Simple Explanation First**: Start with a plain-English analogy '
            'that a non-technical person can understand.\n'
            '2. **Technical Explanation**: Follow with a precise technical '
            'description using Dirac notation and matrix representations.\n'
            '3. **Step Insight**: If the user is asking about a specific step, '
            'explain what happens to the quantum state at that step.\n'
            '4. **Final Output Explanation**: Summarize what the circuit produces '
            'and what measurement outcomes mean.\n'
            '5. Keep answers concise but informative — 150-300 words.\n'
            '6. Use markdown formatting (bold, bullets) and USE LaTeX for math formulas using `$ ... $` (inline) and `$$ ... $$` (block).\n'
            '7. Be encouraging and supportive.'
        )

        logger.info(f'AI explain request — model={model}, prompt_len={len(user_prompt)}')

        response = http_requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Quantum Logic Gate Simulator',
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt},
                ],
                'max_tokens': 1024,
                'temperature': 0.7,
            },
            timeout=30,
        )

        if response.status_code != 200:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            error_msg = error_data.get('error', {}).get('message', f'OpenRouter returned {response.status_code}')
            logger.error(f'OpenRouter error: {error_msg}')
            return jsonify({'error': error_msg}), response.status_code

        result = response.json()
        explanation = result.get('choices', [{}])[0].get('message', {}).get('content', '')

        if not explanation:
            return jsonify({'error': 'No explanation returned from AI'}), 502

        return jsonify({
            'explanation': explanation,
            'model': model,
        }), 200

    except http_requests.exceptions.Timeout:
        logger.error('OpenRouter request timed out')
        return jsonify({'error': 'AI request timed out. Please try again.'}), 504
    except http_requests.exceptions.ConnectionError:
        logger.error('Cannot connect to OpenRouter')
        return jsonify({'error': 'Cannot connect to AI service. Check your internet connection.'}), 503
    except Exception as e:
        logger.error(f'AI explain error: {e}')
        return jsonify({'error': f'AI service error: {str(e)}'}), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
