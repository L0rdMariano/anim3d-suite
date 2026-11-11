# Fontes e confiança dos números do motor Wi-Fi

Verificado por busca pública em 2026-11-11. Os resumos abaixo vêm dos resultados de busca; as páginas não foram lidas por inteiro. **Nenhuma fonte é norma técnica.** Valores publicados variam muito com espessura e construção: para proposta, meça no local.

## Limiares de sinal (`nivelDe`)

| Faixa no motor | Respaldo | Confiança |
|---|---|---|
| **bom ≥ −67 dBm** | Guias de site survey da Cisco (telefone 7920 e 8821) recomendam borda de célula em −67 dBm com SNR ≈ 25 dB para voz; comunidade Aruba recomenda cobertura mínima de −67 dBm. [Cisco 7920](https://www3-realm.cisco.com/en/US/docs/wireless/technology/7920/site_survey/guide/survovr.html), [Aruba](https://community.arubanetworks.com/t5/Controller-Based-WLANs/How-should-I-space-my-APs-for-optimum-Wi-Fi-voice-coverage/ta-p/179266) | **média-alta** (documentação de fabricante) |
| **aceitável ≥ −75 dBm** | Sem fonte primária. Um blog de fornecedor o chama "razoável" para web e e-mail. O mínimo de célula de dados da Cisco a 11 Mbps é −82 dBm. | **baixa**: é uma faixa de apresentação do exemplo, não um padrão |
| **fraco ≥ −85 dBm** | Sem fonte primária | **baixa**: idem |

## Perda por material (`PERDA_MATERIAL`, dB por parede)

Faixas publicadas (fontes de fornecedores e calculadoras, **não** normas):

| Material | Valor no motor (2,4 / 5 GHz) | Faixas vistas na busca |
|---|---|---|
| Drywall | 3 / 4 | 1–2 / 2–3,5 (chapa de 1/2") até 3–6 / 5–10 (divisória leve) |
| Tijolo | 6 / 9 | 8–10 / 15–20 (120 mm); 12–15 / 20–25 (240 mm) → **o motor está abaixo da faixa** |
| Concreto | 12 / 18 | 12–25 / 26–30 (100 mm); 23–25 / 30–55 (200 mm); armado 20–30 em 5 GHz |
| Vidro, metal | 2 / 3 e 25 / 30 | sem faixa confiável encontrada |

Fontes: [interline.pl](https://interline.pl/Information-and-Tips/Building-Materials-and-Wi-Fi-Signal-Loss-2.4-GHz-and-5-GHz), [iBwave](https://blog.ibwave.com/tag/3d-modeling/page/2/), [kindatechnical](https://kindatechnical.com/networking/wireless-site-surveys-planning.html), [signalboosters](https://www.signalboosters.com/blog/materials-that-block-wifi-signals). Concordam em um ponto: **5 GHz perde mais por parede que 2,4 GHz** (diferença de ~3–5 dB em divisórias; maior em alvenaria e concreto).

## Expoente de perda (`EXPOENTE = 3`)

- Medições citadas: escritório com divisórias duras ≈ 3,0 e com divisórias leves ≈ 2,4–2,6 ([Wikipedia: log-distance path loss](https://en.wikipedia.org/wiki/Log-distance_path_loss_model), a partir de Goldhirsh e Vogel); linha de visada obstruída em prédio universitário 2,1–2,6 ([IJEECS](https://ijeecs.iaescore.com/index.php/IJEECS/article/download/18978/13171)).
- **Limitação conhecida:** esses expoentes já embutem as obstruções. O motor soma `EXPOENTE = 3` **e** a perda de cada parede explícita, então pode contar a obstrução **duas vezes** e ficar pessimista. Modelos multi-parede costumam usar um expoente próximo do espaço livre (2) com as paredes explícitas; isso ainda precisa ser confirmado na fonte (por exemplo, COST 231) antes de mudar o cálculo.

## O que fazer com isso

Trate o mapa como **comparativo** (qual posição de AP é melhor, qual banda cobre menos), não como previsão absoluta. Para uma proposta, calibre materiais, expoente e limiares com site survey.
