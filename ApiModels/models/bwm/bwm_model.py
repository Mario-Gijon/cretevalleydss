import numpy as np
from pyDecision.algorithm import bw_method

def run_bwm(experts_data, eps_penalty=1):
    try:
        if not experts_data or len(experts_data) == 0:
            return {"success": False, "msg": "No expert data provided"}
        mic_list, lic_list = [], []

        for expert, values in experts_data.items():
            mic = np.array(values.get("mic", []), dtype=float)
            lic = np.array(values.get("lic", []), dtype=float)

            if mic.size == 0 or lic.size == 0:
                print(f"Skipping expert {expert} due to incomplete data")
                continue

            mic_list.append(mic)
            lic_list.append(lic)

        if len(mic_list) == 0 or len(lic_list) == 0:
            return {"success": False, "msg": "No valid expert data to aggregate"}

        # --- Agregación (media aritmética) ---
        mic_avg = np.mean(np.vstack(mic_list), axis=0)
        lic_avg = np.mean(np.vstack(lic_list), axis=0)

        # --- Ejecutar BWM con los promedios ---
        weights = bw_method(mic_avg, lic_avg, eps_penalty=eps_penalty, verbose=False)

        return {
            "success": True,
            "weights": weights.tolist(),
            "n_experts": len(mic_list),
            "mic_avg": mic_avg.tolist(),
            "lic_avg": lic_avg.tolist()
        }

    except Exception as e:
        return {"success": False, "msg": f"Error in run_bwm: {str(e)}"}
