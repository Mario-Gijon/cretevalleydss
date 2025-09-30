from fastapi import FastAPI, Request # type: ignore
from models.herrera_viedma_crp.herrera_viedma_crp_model import run_herrera_viedma
from models.topsis.topsis_model import run_topsis
from models.borda.borda_model import run_borda
from models.aras.aras_model import run_aras
from models.fuzzy_topsis.fuzzy_topsis_model import run_fuzzy_topsis


app = FastAPI()

@app.post("/herrera_viedma_crp")
async def herrera_viedma_crp(request: Request):
  try:
    
    data = await request.json()
    
    matrices = data["matrices"]
    
    consensusThreshold = data["consensusThreshold"]
  
    results = run_herrera_viedma(
      matrices,
      maxRounds=1,
      cl=consensusThreshold,
      ag_lq=data["modelParameters"]["ag_lq"],
      ex_lq=data["modelParameters"]["ex_lq"],
      b=data["modelParameters"]["b"],
      beta=data["modelParameters"]["beta"],
      w_crit=[1.0]
    )


    results["alternatives_rankings"] = results["alternatives_rankings"][-1].tolist()
  
    return { "success": True, "msg": "Herrera Viedma CRP executed successfully", "results": results } 
  except Exception as e:
    return { "success": False, "msg": f"Error executing Herrera Viedma CRP: {str(e)}" }


@app.post("/topsis")
async def topsis(request: Request):
  try:
    
    data = await request.json()
    
    matrices = data["matrices"]
  
    results = run_topsis(matrices, weights=data["modelParameters"]["weights"], criterion_type=data["criterionTypes"])
  
    return { "success": True, "msg": "Topsis executed successfully", "results": results } 
  except Exception as e:
    return { "success": False, "msg": f"Error executing Topsis: {str(e)}" }
  
  
@app.post("/borda")
async def topsis(request: Request):
  try:
    
    data = await request.json()
    
    matrices = data["matrices"]
  
    results = run_borda(matrices, criterion_type=data["criterionTypes"])
  
    return { "success": True, "msg": "Borda executed successfully", "results": results } 
  except Exception as e:
    return { "success": False, "msg": f"Error executing Borda: {str(e)}" }
  
@app.post("/aras")
async def topsis(request: Request):
  try:
    
    data = await request.json()
    
    matrices = data["matrices"]
  
    results = run_aras(matrices, weights=data["modelParameters"]["weights"], criterion_type=data["criterionTypes"])
  
    return { "success": True, "msg": "Aras executed successfully", "results": results } 
  except Exception as e:
    return { "success": False, "msg": f"Error executing Aras: {str(e)}" }


@app.post("/fuzzy_topsis")
async def fuzzy_topsis(request: Request):
    try:
        data = await request.json()
        matrices = data["matrices"]
        weights = data["modelParameters"]["weights"]
        criterion_type = data["criterionTypes"]

        results = run_fuzzy_topsis(matrices, weights, criterion_type)

        return {
            "success": True,
            "msg": "Fuzzy TOPSIS executed successfully",
            "results": results
        }
    except Exception as e:
        return {"success": False, "msg": f"Error executing Fuzzy TOPSIS: {str(e)}"}