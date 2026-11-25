"""
Os números do simulador, cada um com a sua origem.

Duas famílias:

- VanHenten: o modelo de alface em estufa de Van Henten (1994), sem mudar nada.
  São os coeficientes da tese, na forma reproduzida por Boersma et al. (2022) e
  Morcego et al. (2023). Não se inventa coeficiente aqui: se um número não tem
  fonte, ele não entra.
- Adaptacao: o que muda para uma estufa brasileira de alface hidropônica NFT
  (exaustor, nebulização, tela de sombra, LED, pés por m²). Cada escolha está
  explicada em docs/decisoes/0004-simulador-van-henten.md.

Os dois são "dataclasses congeladas": um pacote de números com nome que
ninguém altera por acidente. Mais tarde (fases 4 a 6 do currículo) dá para
sortear variações deles, para a rede não decorar uma estufa só.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class VanHenten:
    # --- crescimento da alface (massa seca x1, kg/m²) ---
    c_alfa_beta: float = 0.544  # p1,1: quanto do CO2 fixado vira massa seca (-)
    c_resp_d: float = 2.65e-7  # p1,2: respiração, em massa seca (1/s)
    c_pl_d: float = 53.0  # p1,3: área de folha efetiva por massa seca (m²/kg)
    c_rad_phot: float = 3.55e-9  # p1,4: eficiência no uso da luz (kg/J)
    c_co2_1: float = 5.11e-6  # p1,5: efeito da temperatura na fotossíntese (m/s/°C²)
    c_co2_2: float = 2.3e-4  # p1,6: idem (m/s/°C)
    c_co2_3: float = 6.29e-4  # p1,7: idem (m/s)
    c_gama: float = 5.2e-5  # p1,8: ponto de compensação de CO2 (kg/m³)
    # --- CO2 do ar (x2, kg/m³) ---
    c_cap_c: float = 4.1  # p2,1: "altura" de ar por m² de piso (m)
    c_resp_c: float = 4.87e-7  # p2,2: respiração, em CO2 (1/s)
    c_vazamento: float = 7.5e-6  # p2,3: troca de ar pelas frestas, com tudo fechado (m/s)
    # --- temperatura do ar (x3, °C) ---
    c_cap_q: float = 3.0e4  # p3,1: capacidade térmica da estufa (J/m²/°C)
    c_cap_q_v: float = 1290.0  # p3,2: calor levado por m³ de ar trocado (J/m³/°C)
    c_ai_ou: float = 6.1  # p3,3: troca de calor pela cobertura (W/m²/°C)
    c_rad_alfa: float = 0.2  # p3,4: fração da radiação que vira calor do ar (-)
    # --- umidade do ar (x4, kg/m³) ---
    c_cap_h: float = 4.1  # p4,1: "altura" de ar para o vapor (m)
    c_v_pl_ai: float = 3.6e-3  # p4,2: transpiração: transferência de vapor da folha (m/s)
    c_v_1: float = 9348.0  # p4,3: vapor saturado, constante 1 (J/m³)
    c_v_2: float = 8314.0  # p4,4: constante dos gases (J/kmol/K)
    c_v_3: float = 273.15  # p4,5: °C para K
    c_v_4: float = 17.4  # p4,6: vapor saturado, constante 2 (-)
    c_v_5: float = 239.0  # p4,7: vapor saturado, constante 3 (°C)


@dataclass(frozen=True)
class Adaptacao:
    """Fontes completas (com links) na decisão 0004."""

    # Exaustor: 1 troca de ar por minuto num pé-direito de ~2,4 m (m³/s por m² de piso).
    # Watson et al., UF/IFAS AE030 (2019). O Van Henten original vai só até 0,0075.
    ventilacao_max: float = 0.041
    # Nebulização cíclica: 8,9 g de água por m² por minuto (Ishii et al. 2016, JARQ 50(2)).
    nebulizacao_max: float = 8.9e-3 / 60
    # Calor que 1 kg de água rouba ao evaporar (J/kg). FAO-56 (Allen et al. 1998).
    calor_latente: float = 2.45e6
    # Tela de sombra: até 50% sem perda na alface (Cometti et al. 2020, Hortic. Bras.).
    sombra_max: float = 0.5
    # LED: 200 µmol/m²/s de luz suplementar (Both 2003) a 2,5 µmol/J (mínimo DLC Hort V4.0)
    # pedem 80 W/m² de potência elétrica.
    lampada_eficacia: float = 2.5
    lampada_w: float = 200 / 2.5
    # Luz: PPFD = radiação global × 0,5 (fração PAR) × 4,6 µmol/J (bigleaf, Rg.to.PPFD).
    par_por_w_global: float = 0.5 * 4.6
    par_por_w_par: float = 4.6
    # Fração do sol que passa pela cobertura. SEM FONTE: estimativa, e só entra no
    # sensor de luz (no Van Henten a cobertura já está embutida em c_rad_phot).
    transmissao: float = 0.7
    # Alface: espaçamento 25×25 cm em NFT (Santos et al. 2023, Irriga 28(2)) = 16 pés/m²;
    # matéria seca = 4,5% da massa fresca (Both 2003; Santos 2023 dá o mesmo).
    pes_por_m2: float = 16.0
    materia_seca: float = 0.045
    # Massa seca no transplante (kg/m²): o estado inicial de Morcego 2023 e Svensen 2024.
    massa_inicial: float = 0.0035


# Constantes físicas usadas nas conversões dos sensores.
R = 8.314  # constante dos gases (J/mol/K)
PRESSAO = 101325.0  # pressão do ar ao nível do mar (Pa)
M_CO2 = 0.044  # massa molar do CO2 (kg/mol)
