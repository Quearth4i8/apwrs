import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.ticker import AutoMinorLocator

# ------------------------------------------------------------
# ET0 - FAO Penman-Monteith
# Chapitre 3 du "ETo Calculator Reference Manual V3.2" (FAO, 2012)
# Memes methodes que FAO Irrigation and Drainage Paper 56.
# ------------------------------------------------------------

# Sur Google Colab : deposer le classeur avec le bouton "Fichiers" a gauche,
# ou decommenter les deux lignes suivantes pour le televerser.
# from google.colab import files
# files.upload()

FILE_PATH = "climate_data_station1ver.xlsx"   #

# Coordonnees de la station (feuille "coordonnees")
LATITUDE = 37.010         # degres decimaux, positif au nord
ALTITUDE = 20             # metres

df_station = pd.read_excel(FILE_PATH)

# Convert 'Date' column to datetime and set it as index
df_station['Date'] = pd.to_datetime(df_station['Date'])
df_station = df_station.set_index('Date')

print(df_station.head())


def col(*prefixes):
    """Retrouve une colonne par son debut, sans se soucier de la casse.

    Les deux classeurs n'ecrivent pas les entetes pareil
    ('relative_humidity% 2m' contre 'relative_humidity%'), donc on cherche
    par prefixe plutot que par nom exact.
    """
    for p in prefixes:
        for c in df_station.columns:
            if str(c).strip().lower().startswith(p):
                return df_station[c]
    raise KeyError(prefixes)

# ------------------------------------------------------------
# 1. PARAMETRES ATMOSPHERIQUES  (3.1)
# ------------------------------------------------------------

# Pression atmospherique (3.1)
P = 101.3 * ((293 - 0.0065 * ALTITUDE) / 293) ** 5.26

# Constante psychrometrique (3.2) : gamma = cp*P/(eps*lambda)
gamma = (1.013e-3 * P) / (0.622 * 2.45)

print(f"\nP = {P:.4f} kPa,  gamma = {gamma:.5f} kPa/degC")

# ------------------------------------------------------------
# 2. TEMPERATURE DE L'AIR  (3.2)
# ------------------------------------------------------------

Tmin = col("tmin")
Tmax = col("tmax")

# Temperature moyenne (3.3)
Tmean = (Tmax + Tmin) / 2

# ------------------------------------------------------------
# 3. HUMIDITE DE L'AIR  (3.3)
# ------------------------------------------------------------

def e0(T):
    """Pression de vapeur saturante a la temperature T (3.4), kPa."""
    return 0.6108 * np.exp(17.27 * T / (T + 237.3))

# Pression de vapeur saturante moyenne (3.5)
# Moyenne de e0(Tmax) et e0(Tmin), pas e0(Tmean) : l'equation 3.4 n'est pas
# lineaire, utiliser la moyenne des temperatures sous-estimerait es.
es = (e0(Tmax) + e0(Tmin)) / 2

# Pente de la courbe de pression de vapeur saturante (3.6)
delta = 4098 * e0(Tmean) / (Tmean + 237.3) ** 2

# Pression de vapeur reelle (3.12) a partir de l'humidite relative moyenne.
# Le manuel precise que 3.12 est plus precise que la formule du Paper 56
# quand seule RHmean est disponible - c'est le cas ici.
RH = col("relative_humidity", "rh")
ea = e0(Tmean) * RH / 100

# Deficit de pression de vapeur
vpd = es - ea

# ------------------------------------------------------------
# 4. RAYONNEMENT  (3.4)
# ------------------------------------------------------------

J = df_station.index.dayofyear.values          # jour de l'annee
phi = np.pi / 180 * LATITUDE                   # latitude en radians (3.15)

dr = 1 + 0.033 * np.cos(2 * np.pi * J / 365)   # distance Terre-Soleil (3.16)
decl = 0.409 * np.sin(2 * np.pi * J / 365 - 1.39)   # declinaison (3.17)

# Angle horaire au coucher du soleil (3.18), borne pour rester dans arccos
ws = np.arccos(np.clip(-np.tan(phi) * np.tan(decl), -1, 1))

# Duree du jour (3.19)
N = 24 / np.pi * ws

# Rayonnement extraterrestre (3.14)
Ra = (24 * 60 / np.pi) * 0.0820 * dr * (
    ws * np.sin(phi) * np.sin(decl) + np.cos(phi) * np.cos(decl) * np.sin(ws)
)
Ra = pd.Series(Ra, index=df_station.index)

# Rayonnement solaire mesure
Rs = col("solar_radiation")

# Rayonnement par ciel clair, ajuste a l'altitude (3.21)
Rso = (0.75 + 2e-5 * ALTITUDE) * Ra

# Rayonnement net de courte longueur d'onde (3.23), albedo 0.23
Rns = (1 - 0.23) * Rs

# Rayonnement net de grande longueur d'onde (3.24)
# Rs/Rso est limite a 1.0 comme le precise le manuel
ratio = np.minimum(Rs / Rso, 1.0)
Rnl = (
    4.903e-9
    * (((Tmax + 273.16) ** 4 + (Tmin + 273.16) ** 4) / 2)
    * (0.34 - 0.14 * np.sqrt(ea.clip(lower=0)))
    * (1.35 * ratio - 0.35)
)

# Rayonnement net (3.25)
Rn = Rns - Rnl

# ------------------------------------------------------------
# 5. VITESSE DU VENT  (3.5)
# ------------------------------------------------------------

# Deja mesuree a 2 m, donc l'ajustement (3.27) ne s'applique pas.
# Sinon : u2 = uz * 4.87 / log(67.8 * z - 5.42)
u2 = col("wind_speed")

# ------------------------------------------------------------
# 6. EVAPOTRANSPIRATION DE REFERENCE  (3.6, equation 3.28)
# ------------------------------------------------------------

# G = 0 : le flux de chaleur dans le sol est neglige au pas de temps
# journalier, comme indique dans le manuel.
G = 0

ET0 = (
    0.408 * delta * (Rn - G) + gamma * (900 / (Tmean + 273)) * u2 * (es - ea)
) / (delta + gamma * (1 + 0.34 * u2))

ET0.name = "ET0_calcule"

print("\n--- ET0 (premieres valeurs) ---")
print(ET0.head(10))

print("\n--- ET0 (statistiques) ---")
print(ET0.describe())

# ------------------------------------------------------------
# 7. VERIFICATION AVEC LA COLONNE DU FICHIER (si elle existe)
# ------------------------------------------------------------

colonnes_et0 = [c for c in df_station.columns
                if str(c).strip().lower().startswith(("et0", "eto"))]
if colonnes_et0:
    ET0_fichier = df_station[colonnes_et0[0]]
    diff = ET0 - ET0_fichier
    print(f"\n--- Comparaison avec '{colonnes_et0[0]}' ---")
    print(f"  biais  = {diff.mean():+.5f} mm/jour")
    print(f"  RMSE   = {np.sqrt((diff ** 2).mean()):.5f} mm/jour")
    print(f"  max    = {diff.abs().max():.4f} mm/jour")
    print("  (la colonne du fichier est arrondie a 1 decimale :")
    print(f"   l'arrondi seul donne deja un RMSE de {np.sqrt(0.1 ** 2 / 12):.4f})")

# ------------------------------------------------------------
# 8. VISUALISATION
# ------------------------------------------------------------

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(ET0.index, ET0.values, linewidth=0.6, color="#2b7fbe")
ax.plot(ET0.resample("ME").mean().index, ET0.resample("ME").mean().values,
        linewidth=1.8, color="#c94c4c", label="moyenne mensuelle")
ax.set_title("ET0 journaliere - FAO Penman-Monteith")
ax.set_ylabel("ET0 (mm/jour)")
ax.legend()
ax.xaxis.set_minor_locator(AutoMinorLocator())
plt.tight_layout()
plt.savefig("eto_station1.png", dpi=150)
print("\nGraphique enregistre : eto_station1.png")

# ------------------------------------------------------------
# 9. EXPORT DES RESULTATS
# ------------------------------------------------------------

df_eto = pd.DataFrame({
    "Tmean": Tmean,
    "es": es,
    "ea": ea,
    "delta": delta,
    "Ra": Ra,
    "Rso": Rso,
    "Rns": Rns,
    "Rnl": Rnl,
    "Rn": Rn,
    "u2": u2,
    "ET0": ET0,
})
df_eto.to_csv("eto_resultats.csv")
print("Resultats exportes : eto_resultats.csv")
