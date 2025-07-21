
import numpy as np # type: ignore
import matplotlib.pyplot as plt # type: ignore
from sklearn.decomposition import PCA # type: ignore
from sklearn.manifold import MDS # type: ignore


# Calcula el cuantificador lingüístico difuso.
# :param r: Índice.
# :param a: Parámetro a del cuantificador lingüístico.
# :param b: Parámetro b del cuantificador lingüístico.
def Q(r, a, b):
    if r < a:
        return 0.0
    elif r > b:
        return 1.0
    else:
        return (r - a) / (b - a)

# Calcula los pesos OWA basados en los parámetros dados.
# :param n: Número de pesos a calcular.
# :param a: Parámetro a del cuantificador lingüístico.
# :param b: Parámetro b del cuantificador lingüístico.
# :return: Lista con los pesos OWA.
def calcular_pesos_OWA(m, lq):

    result = [0.0] * m
    q_values = {}

    for k in range(1, m + 1):
        r1 = k / m
        r2 = (k - 1) / m

        if r1 not in q_values:
            q_values[r1] = Q(r1, lq[0], lq[1])
        if r2 not in q_values:
            q_values[r2] = Q(r2, lq[0], lq[1])

        result[k - 1] = round(q_values[r1] - q_values[r2], 2)

    return result

# Aplica el operador OWA a una lista de valores usando los pesos dados.
# :param valores: Lista de valores a agregar.
# :param pesos: Lista de pesos OWA (debe tener la misma longitud que valores).
# :return: Valor agregado mediante OWA.
def owa(valores, pesos):
    valores_ordenados = sorted(valores, reverse=True)  # Ordenamos los valores en orden descendente
    return sum(v * w for v, w in zip(valores_ordenados, pesos))

# Calcula el valor agregado usando una variante del operador OWA OR-like.
# :param values: Lista de valores a agregar.
# :param beta: Parámetro de rigurosidad de consenso.
# :param Xsol: Conjunto de índices seleccionados.
# :return: Valor de agregación redondeado a 2 decimales.
def s_owa_or_like(values, beta, Xsol):
  size_1 = len(Xsol)
  size_2 = len(values) - size_1

  value_1 = sum(values[i] for i in Xsol) / size_1 if size_1 > 0 else 0.0
  value_2 = sum(values[i] for i in range(len(values)) if i not in Xsol) / size_2 if size_2 > 0 else 0.0

  return ((1 - beta) * value_1) + (beta * value_2)

# Agrega las opiniones de los expertos por criterio y después por alternativas mediante el operador OWA.
# :param pref: Preferencias de los expertos.
# :param n_exp: Número de expertos.
# :param n_alt: Número de alternativas.
# :param n_crit: Número de criterios.
# :param w_cri: Pesos asociados a los criterios.
# :param w_exp: Pesos asociados a los expertos.
# :return: Opinión colectiva de los expertos.
def calcular_colectiva_OWA(pref, n_exp, n_alt, n_crit, w_cri, w_exp):
  # Paso 1: Agregar todas las matrices de cada experto en una única matriz por experto
  agregacion_por_experto = np.zeros((n_exp, n_alt, n_alt))

  for exp in range(n_exp):
      for i in range(n_alt):
          for j in range(n_alt):
            valores = [pref[exp * n_crit + cr][i][j] for cr in range(n_crit)]
            agregacion_por_experto[exp][i][j] = owa(valores, w_cri)  # OWA sobre criterios

  # Paso 2: Agregar las matrices resultantes de cada experto en una única matriz final
  matriz_colectiva = np.zeros((n_alt, n_alt))

  for i in range(n_alt):
    for j in range(n_alt):
      valores = [agregacion_por_experto[exp][i][j] for exp in range(n_exp)]
      matriz_colectiva[i][j] = owa(valores, w_exp) # OWA sobre expertos

  return matriz_colectiva

# Calcula el QGDD aplicando el operador OWA sobre las preferencias de cada alternativa.
# :param n_alt: Número de alternativas.
# :param pref: Matriz de preferencias.
# :param w: Vector de pesos OWA.
# :param owa: Función que aplica el operador OWA.
# :return: Vector de valores QGDD para cada alternativa.
def calcular_QGDD(n_alt, pref, w):
  result = np.zeros(n_alt)

  for i in range(n_alt):
    values = np.array([pref[i][j] for j in range(n_alt)])  # Extraer la fila i
    result[i] = owa(values, w)  # Aplicar OWA a la fila

  return result

# Calcula la diferencia de posiciones entre un ranking de un experto y el ranking colectivo
# :param c_ranking: Lista con el ranking colectivo.
# :param e_ranking: Lista con el ranking de un experto.
# :return: Lista ordenada con las diferencias de posiciones.
def diferencia_ranking(c_ranking, e_ranking):
    # Crear diccionarios con las posiciones de cada alternativa en los rankings
    pos_colectivo = {alt: i for i, alt in enumerate(c_ranking)}
    pos_expert = {alt: i for i, alt in enumerate(e_ranking)}

    # Calcular la diferencia en orden de las alternativas del ranking colectivo
    differences = [pos_colectivo[alt] - pos_expert[alt] for alt in sorted(pos_colectivo.keys())]

    return differences

# Calcula las diferencias entre los rankings de los expertos y el ranking del grupo.
# :param alternatives_rankings: Lista de listas donde cada fila es un ranking.
# :return: Matriz de diferencias entre los rankings de los expertos y el ranking del grupo.
def calcular_diferencia_rankings(alternatives_rankings):
    n_exp = len(alternatives_rankings) - 1  # Última fila es el ranking del grupo
    n_alt = len(alternatives_rankings[0])

    result = np.zeros((n_exp, n_alt), dtype=int)  # Matriz de diferencias

    c_ranking = alternatives_rankings[-1]  # Última fila = ranking del grupo

    for i in range(n_exp):
        result[i] = diferencia_ranking(c_ranking, alternatives_rankings[i])

    return result

# Devuelve un conjunto con los índices donde el valor en ranking es 0 (primera posición).
# :param ranking: Ranking de las alterantivas.
# :return: Conjunto de índices donde ranking[i] == 0.
def conjunto_solucion(ranking):
  return {i for i, value in enumerate(ranking) if value == 0}

# Calcula los grados de consenso sobre alternativas para cada experto.
# :param differences_between_rankings: Matriz de diferencias entre rankings (n_exp x n_alt).
# :param b: Parámetro de rigurosidad de consenso.
# :return: Matriz de grados de consenso (n_exp x n_alt).
def calcular_consenso_exp_alt(differences_between_rankings, b):
    n_exp = len(differences_between_rankings)
    n_alt = len(differences_between_rankings[0])

    result = np.zeros((n_exp, n_alt), dtype=float)

    for e in range(n_exp):
        for a in range(n_alt):
            result[e][a] = round((abs(differences_between_rankings[e][a]) / (n_alt - 1)) ** b, 2)

    return result

# Calcula los grados de consenso para cada alternativa a partir de los expertos.
# :param consensus_degrees_on_alternatives_by_experts: Matriz de grados de consenso (n_exp x n_alt).
# :return: Vector con los grados de consenso para cada alternativa.
def calcular_consenso_alt(consensus_degrees_exp_alt, n_alt, n_exp):
  result = np.zeros(n_alt, dtype=float)

  for a in range(n_alt):
    result[a] = sum(consensus_degrees_exp_alt[e][a] for e in range(n_exp)) / n_exp
    result[a] = round(1.0 - result[a], 2)  # Se invierte el valor y se redondea a 2 decimales

  return result

# Calcula la medida de proximidad aplicando la transformación 1 - value y luego OWA OR-like.
# :param proximity_measures_by_expert: Lista de valores de proximidad de cada experto.
#:param beta: Parámetro de ponderación.
#:param Xsol: Conjunto de índices seleccionados.
# :return: Medida de proximidad calculada.
def calcular_proximidad(proximity_measures_exp, beta, Xsol):
  aux = [1.0 - value for value in proximity_measures_exp]

  return s_owa_or_like(aux, beta, Xsol)

# Calcula las medidas de proximidad para cada experto.
# :param proximity_measures_by_experts: Matriz de proximidades (n_experts x n_alternatives).
# :param beta: Parámetro de ponderación.
# :param Xsol: Conjunto de índices seleccionados.
# :return: Lista con las medidas de proximidad calculadas para cada experto.
def calcular_medidas_proximidad(proximity_measures_exp, beta, Xsol):
  experts = len(proximity_measures_exp)

  return [calcular_proximidad(proximity_measures_exp[i], beta, Xsol) for i in range(experts)]

# Selecciona los expertos más alejado a la solución del grupo (la mitad menos cercana).
# :param proximity_measures: Lista con las medidas de proximidad de los expertos.
# :return: Conjunto de índices de los expertos con menor proximidad.
def expertos_mas_alejados(proximity_measures):
  ordered_values = sorted(proximity_measures)

  threshold = ordered_values[len(ordered_values) // 2]

  return {i for i, value in enumerate(proximity_measures) if value <= threshold}

# Determina los cambios en las preferencias de cada experto en función de las diferencias de ranking.
# :param farthest_experts: Conjunto de índices de los expertos más alejados de la opinión del grupo.
# :param differences_between_rankings: Matriz de diferencias entre rankings (n_exp x n_alt).
# :return: Diccionario donde las claves son los expertos y los valores son listas con los tipos de cambio.
def detectar_cambios(farthest_experts, differences_between_rankings):
  result = {}

  n_alt = len(differences_between_rankings[0])

  for exp in farthest_experts:
    changes = []
    for alt in range(n_alt):
      diff = differences_between_rankings[exp][alt]
      if diff < 0:
        changes.append(1) # Incrementar la preferencia.
      elif diff == 0:
        changes.append(0) # No modificar la preferencia.
      else:
        changes.append(-1) # Decrementar la preferencia.

    result[exp] = changes

  return result

# Genera una lista de cambios basada en una distribución binomial.
# :param number_of_changes: Número total de cambios a generar.
# :param prob_accept: Probabilidad de aceptar un cambio (valor entre 0 y 1).
# :param scale: Factor de escala para determinar la magnitud del cambio.
# :return: Lista con los valores de cambio aceptados o 0 si es rechazado.
def simular_comportamiento(number_of_changes, prob_accept, scale):

  # Simulación de aceptación/rechazo basada en una distribución binomial
  accept_changes = np.random.binomial(1, prob_accept, number_of_changes)

  # Generar valores de cambio aleatorios en un rango [-scale, scale]
  change_values = np.random.uniform(0, scale, number_of_changes)

  # Aplicar los cambios solo si fueron aceptados, si no, asignar 0
  final_changes = change_values * accept_changes

  return final_changes.tolist()




# Modifica las preferencias de los expertos en base a los cambios calculados.
# :param changes: Diccionario con la lista de cambios
# :param preferences: Matrices de preferencias de expertos.
def aplicar_cambios(changes, preferences):
    n_alt = len(preferences[0])

    # Contar cuántos cambios se deben hacer
    number_of_changes = sum(
        1 for changes_array in changes.values() for change in changes_array if change != 0
    )

    # Obtener el comportamiento de los expertos sobre los cambios. Esto permite simular si los expertos aceptan o rechazan los cambios. Con expertos reales no es necesario pero lo tendremos en cuenta para las simulaciones.
    changes_to_make = simular_comportamiento(number_of_changes, 1.0, 0.2)

    # Aplicar cambios
    number_of_changes = 0
    for expert_index, changes_array in changes.items():
      for i, change in enumerate(changes_array):
        if change != 0:
          value = changes_to_make[number_of_changes]
          number_of_changes += 1

          if value != 0.0:
            if change == -1:
              value *= -1.0  # Si el cambio es Decrease, el valor se hace negativo

            for j in range(n_alt):
              if i != j:
                new_value = preferences[expert_index][i][j]
                new_value += value

                # Asegurar que el nuevo valor esté en el rango [0,1]
                new_value = max(0.0, min(1.0, new_value))

                preferences[expert_index][i][j] = new_value # Nuevo valor para la preferencia
                
                

def get_plots_graphics(preferences, method):
  preferences_flat = np.array([pref.flatten() for pref in preferences])

  # Sustituir los ceros por un valor muy pequeño (sin modificar los valores no nulos)
  preferences_flat[preferences_flat == 0] = 1e-10

  if method == 'PCA':
      reducer = PCA(n_components=2)
  else:
      reducer = MDS(n_components=2, dissimilarity='euclidean', random_state=42)

  transformed = reducer.fit_transform(preferences_flat)

  collective_point = transformed[-1]
  expert_points = transformed[:-1] - collective_point

  # Aproximar todos los valores a 4 decimales
  collective_point = np.round(collective_point, 4).tolist()
  expert_points = np.round(expert_points, 4).tolist()

  return {
      "expert_points": expert_points,
      "collective_point": collective_point
  }

