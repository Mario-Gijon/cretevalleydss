
import numpy as np # type: ignore
import matplotlib.pyplot as plt # type: ignore
from sklearn.decomposition import PCA # type: ignore
from sklearn.manifold import MDS # type: ignore

from models.herrera_viedma_crp.utils import calcular_pesos_OWA, calcular_colectiva_OWA, calcular_QGDD, conjunto_solucion, calcular_diferencia_rankings, calcular_consenso_exp_alt, calcular_consenso_alt, get_plots_graphics, s_owa_or_like, calcular_medidas_proximidad, expertos_mas_alejados, detectar_cambios, aplicar_cambios

def run_herrera_viedma(matrices, cl, ag_lq, ex_lq, b, beta, w_crit):
  # Número de expertos y alternativas
  n_exp = len(matrices)
  first_user_data = next(iter(matrices.values()))
  criterion_name = next(iter(first_user_data))
  first_matrix = first_user_data[criterion_name]
  n_alt = len(first_matrix)
  n_crit = 1
  
  # Crear el array de preferencias (n_exp, n_alt, n_alt)
  pref = np.zeros((n_exp+1, n_alt, n_alt))

  # Llenamos 'pref' con las matrices de las preferencias de los expertos
  for i, experto in enumerate(matrices.values()):
      pref[i] = np.array(experto[criterion_name])
  cl = 0.85

  # PARÁMETROS DEL MODELO DE CONSENSO HERRERA-VIEDMA

  """ ag_lq = [0.3, 0.8] # Parámetros usados para la agregación de preferencias. Cuantificadores lingüísticos most(0.3,0.8), at least half(0,0.5), as many as possible(0.5,1). """
  """ ex_lq = [0.5, 1.0] # Parámetros usados para obtener el ranking. Cuantificadores lingüísticos most(0.3,0.8), at least half(0,0.5), as many as possible(0.5,1). """
  """ b = 1.0 # Parámetro de rigurosidad del proceso de consenso. Valores apropiados: 0.5, 0.7, 0.9 y 1.0. """
  """ beta = 0.8 # Parámetro para controlar el comportamiento del operador OWA OR-LIKE. Valor en [0,1]. """

  # PROCESO DE CONSENSO
  # ====================

  """ w_crit = [1.0] # Solo hay un criterio, por lo tanto peso 1.0. """
  w_exp = calcular_pesos_OWA(n_exp, ag_lq) # Calculamos los pesos OWA de los expertos mediante los cuantificadores lingüísticos.
  w_alt = calcular_pesos_OWA(n_alt, ex_lq) # Calculamos los pesos OWA de las alternativas mediante los cuantificadores lingüísticos.

  cm = 0.0 # Inicializamos el consenso del grupo a 0 (disenso total).
  c_round = 0 # Ronda actual del proceso de consenso.

  """ while c_round < maxRounds and cm < cl: # El proceso acaba cuando alcanzemos el máximo de rondas permitido o el umbral de consenso """
  col = calcular_colectiva_OWA(pref, n_exp, n_alt, n_crit, w_crit, w_exp) # Calculamos la colectiva del grupo agregando con el operador OWA.
  pref[-1] = col # Almacenamos la colectiva en la última posición del array de preferencias.

  #visualizar_preferencias(pref, "Ronda " + str(c_round), 'MDS') # Esto no tiene nada que ver con el modelo, simplemente es una representación gráfica que ayudar a entender cómo evoluciona el proceso.
  plots = get_plots_graphics(pref, 'MDS') # Esto no tiene nada que ver con el modelo, simplemente es una representación gráfica que ayudar a entender cómo evoluciona el proceso.

  alternatives_rankings = [None] * (n_exp + 1)
  qgdd_list = [None] * (n_exp + 1)  

  for i in range(n_exp + 1):
    QGDD = calcular_QGDD(n_alt, pref[i], w_alt)
    qgdd_list[i] = QGDD           
    alternatives_rankings[i] = np.argsort(QGDD)[::-1]

  collective_scores = qgdd_list[-1] 


  xSol = conjunto_solucion(alternatives_rankings[-1]) # Conjunto solución de la/s mejor/es alternativas según la opinión colectiva.

  differences_rankings = calcular_diferencia_rankings(alternatives_rankings) # Calculamos las diferencias entre los rankings de los expertos y el ranking del grupo.
  consensus_degree_exp_alt = calcular_consenso_exp_alt(differences_rankings, b) # Calculamos el grado de consenso por alternativas para cada experto.
  consensus_degree_alt = calcular_consenso_alt(consensus_degree_exp_alt, n_alt, n_exp) # Calculamos el grado de consenso colectivo para cada alternativa.
  cm = s_owa_or_like(consensus_degree_alt, beta, xSol) # Calculamos el grado de consenso colectivo mediante el operador OWA OR-LIKE.

  if cm < cl: # Si no hemos alcanzado el umbral mínimo de consenso hay que recomendar a los expertos que cambien sus preferencias.
    proximity_measures = calcular_medidas_proximidad(consensus_degree_exp_alt, beta, xSol) # Calculamos la proximidad de cada experto a la solución colectiva.
    farthest_experts = expertos_mas_alejados(proximity_measures) # Obtenemos los expertos cuyas opiniones están más alejadas de la opinión del grupo.
    changes = detectar_cambios(farthest_experts, differences_rankings) # Identificamos los cambios a sugerir a los expertos.
    aplicar_cambios(changes, pref) # Aplicamos los cambios a las preferencias de los expertos.

    c_round = c_round + 1
      
  return {
    "alternatives_rankings": alternatives_rankings,
    "cm": round(cm, 2),
    "collective_scores": [round(float(x), 6) for x in collective_scores],  # ✅ NUEVO
    "collective_evaluations": {criterion_name: [[round(cell, 2) for cell in row] for row in pref[-1]]},
    "plots_graphic": plots
  }



