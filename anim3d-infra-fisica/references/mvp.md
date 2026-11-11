# MVP de referência (ordem de construção)

1. Prédio com **3 salas e um corredor** (`Sala` com retângulo e andar).
2. **Sala de servidores** com **2 racks** de 42 U (`Rack`, capacidade em W).
3. Instalar **switches, patch panels e servidores** (`acharVaga` + `Instalacao`).
4. **Pontos de rede** (tomadas) nas salas.
5. **Ligar fisicamente** tudo: cabo com `{equipamento, porta}` nas duas pontas e `caminho` pela calha.
6. `gerarTopologiaLogica` (`anim3d-rede-logica`) produz a topologia lógica sozinha.
7. Mostrar o **caminho dos cabos em 3D** (Cable Routing).
8. **Interromper** um cabo/switch e mostrar quem perde conexão (`impactoDeFalha`).
9. Gerar **planta técnica** e **diagrama de rede** (`anim3d-infra-validacao`).

Só depois: energia detalhada, Wi-Fi (`anim3d-wifi-rf`), câmeras, controle de acesso e integração com equipamentos reais.

Distinção importante: simular conectividade, VLAN e tráfego **não** é executar o sistema operacional de roteadores e switches. Comece pelo motor próprio de validação e simulação lógica; integrar com emuladores de rede é etapa posterior.
