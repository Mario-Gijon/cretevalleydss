from fastapi import FastAPI, Request # type: ignore
from models.herrera_viedma_crp.herrera_viedma_crp_model import run_herrera_viedma
from models.topsis.topsis_model import run_topsis


app = FastAPI()

@app.post("/herrera_viedma_crp")
async def herrera_viedma_crp(request: Request):
  try:
    
    data = await request.json()
    
    matrices = data["matrices"]
    
    consensusThreshold = data["consensusThreshold"]
  
    results = run_herrera_viedma(matrices, maxRounds=1, cl=consensusThreshold, ag_lq=[0.3, 0.8], ex_lq=[0.5, 1.0], b=1.0, beta=0.8, w_crit=[1.0])

    results["alternatives_rankings"] = results["alternatives_rankings"][-1].tolist()
  
    return { "success": True, "msg": "Herrera Viedma CRP executed successfully", "results": results } 
  except Exception as e:
    return { "success": False, "msg": f"Error executing Herrera Viedma CRP: {str(e)}" }


@app.post("/topsis")
async def topsis(request: Request):
  try:
    
    data = await request.json()
    
    matrices = data["matrices"]
    
    print(matrices)
  
    results = run_topsis(matrices, weights=[0.25, 0.25, 0.25, 0.25], criterion_type=["max", "max", "max", "max"])
  
    return { "success": True, "msg": "Topsis executed successfully", "results": results } 
  except Exception as e:
    return { "success": False, "msg": f"Error executing Topsis: {str(e)}" }
