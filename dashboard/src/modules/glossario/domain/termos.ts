/**
 * Glossário: o texto por trás de cada "o que é isso?" (ⓘ) da interface.
 *
 * Por que um módulo só de texto: o mesmo termo (VPD, elitismo, nota...) aparece
 * em várias telas, e a explicação precisa ser a mesma em todas. Escrito para
 * dois leitores ao mesmo tempo, o produtor e a banca: frases curtas, sem jargão
 * sem explicar, e números tirados do próprio projeto (docs/plano.md, faixas.ts).
 *
 * `curto` cabe ao lado do nome ("VPD · a sede do ar"); `explicacao` cabe num
 * balão; `exemplo` é opcional e concreto. Os testes vigiam esses tamanhos.
 */

export type Termo = {
  id: string
  nome: string
  /** Até 8 palavras, para mostrar ao lado do nome. */
  curto: string
  /** 2 a 3 frases curtas, em português simples. */
  explicacao: string
  exemplo?: string
  /** Ids de outros termos, para "veja também". */
  relacionados?: IdTermo[]
}

export type IdTermo =
  // estufa e planta
  | 'vpd'
  | 'ec'
  | 'ph'
  | 'umidadeRelativa'
  | 'co2'
  | 'ppfd'
  | 'nft'
  | 'temperaturaAgua'
  | 'reservatorio'
  | 'turgor'
  | 'clorose'
  | 'necrose'
  | 'faixaBoa'
  // quem controla
  | 'agente'
  | 'regrasFixas'
  | 'pid'
  // rede neural
  | 'redeNeural'
  | 'neuronio'
  | 'peso'
  | 'vies'
  | 'ativacao'
  | 'tanh'
  | 'sigmoide'
  | 'mlp'
  | 'normalizacao'
  | 'entrada'
  | 'saida'
  // treino
  | 'neuroevolucao'
  | 'populacao'
  | 'geracao'
  | 'elitismo'
  | 'torneio'
  | 'cruzamento'
  | 'mutacao'
  | 'nota'
  | 'curriculo'
  | 'fase'
  | 'misturaFases'
  | 'esquecimentoCatastrofico'
  | 'campeao'
  | 'semente'
  | 'gravacao'
  | 'replay'
  // mundo real e segurança
  | 'camadaSeguranca'
  | 'acaoBarrada'
  | 'perturbacao'
  | 'randomizacaoDominio'
  | 'gemeoDigital'
  // dinheiro
  | 'pontoEquilibrio'
  | 'margem'
  | 'tarifaKwh'
  | 'cenarioPreco'
  | 'atribuicao'

// Regra de escrita: nada de "ex." nem milhar com ponto ("1.024"): o ponto
// encerraria a frase no contador dos testes. Decimais usam vírgula.
export const TERMOS: Record<IdTermo, Termo> = {
  // ---------- estufa e planta ----------
  vpd: {
    id: 'vpd',
    nome: 'VPD',
    curto: 'a sede do ar',
    explicacao:
      'Déficit de pressão de vapor: o quanto o ar ainda "puxa" água da folha. Ar muito seco faz a alface transpirar demais e murchar; ar saturado trava a transpiração e favorece fungo. Junta temperatura e umidade num número só.',
    exemplo: 'Faixa boa: 0,5 a 1,2 kPa. A 24 °C com 70% de umidade, o VPD fica perto de 0,9 kPa.',
    relacionados: ['umidadeRelativa', 'turgor', 'faixaBoa'],
  },
  ec: {
    id: 'ec',
    nome: 'EC',
    curto: 'quanto adubo tem na água',
    explicacao:
      'Condutividade elétrica da solução: quanto mais sal nutritivo dissolvido, mais a água conduz corrente. EC baixa deixa a planta com fome; EC alta "queima" a raiz e dificulta beber água.',
    exemplo: 'Faixa boa para alface: 1,2 a 1,8 mS/cm. Abaixo disso, o agente doseia a solução A/B.',
    relacionados: ['ph', 'nft', 'clorose', 'necrose'],
  },
  ph: {
    id: 'ph',
    nome: 'pH',
    curto: 'acidez da água',
    explicacao:
      'Mede se a solução está ácida ou básica, numa escala de 0 a 14. Fora da faixa certa, a raiz não consegue absorver alguns nutrientes mesmo que eles estejam na água.',
    exemplo: 'Faixa boa: 5,5 a 6,5. Acima de 6,5 o ferro fica preso e a folha amarela.',
    relacionados: ['ec', 'clorose', 'camadaSeguranca'],
  },
  umidadeRelativa: {
    id: 'umidadeRelativa',
    nome: 'Umidade relativa',
    curto: 'quanta água o ar carrega',
    explicacao:
      'Porcentagem de vapor no ar em relação ao máximo que ele aguentaria naquela temperatura. O mesmo vapor dá umidade menor no ar quente, por isso ela anda junto com a temperatura.',
    exemplo: 'Faixa boa: 60% a 80%. A nebulização sobe a umidade; a ventilação baixa.',
    relacionados: ['vpd'],
  },
  co2: {
    id: 'co2',
    nome: 'CO₂',
    curto: 'o gás que vira folha',
    explicacao:
      'Gás carbônico do ar, matéria-prima da fotossíntese. Com a estufa fechada e muita luz, a planta consome o CO₂ e o crescimento desacelera; ventilar traz ar de fora.',
    exemplo: 'Faixa boa: 400 a 1000 ppm. O ar de fora tem cerca de 420 ppm.',
    relacionados: ['ppfd'],
  },
  ppfd: {
    id: 'ppfd',
    nome: 'Luz (PPFD)',
    curto: 'quanta luz útil chega à folha',
    explicacao:
      'Densidade de fluxo de fótons: conta só a luz que a planta usa na fotossíntese. Luz demais esquenta e estressa a alface; de menos, ela cresce devagar e estiola.',
    exemplo:
      'Faixa usada aqui: até 600 µmol/m²/s. O sombreamento corta o excesso, a luz suplementar cobre o dia nublado.',
    relacionados: ['co2'],
  },
  nft: {
    id: 'nft',
    nome: 'NFT',
    curto: 'filme fino de água nas raízes',
    explicacao:
      'Técnica do filme de nutrientes: a alface fica em canaletas e uma lâmina fina de solução corre sem parar pelas raízes. Se a bomba para, a raiz seca em poucas horas.',
    exemplo: 'A bomba de circulação leva a solução do reservatório às canaletas e ela volta por gravidade.',
    relacionados: ['reservatorio', 'temperaturaAgua', 'ec'],
  },
  temperaturaAgua: {
    id: 'temperaturaAgua',
    nome: 'Temperatura da água',
    curto: 'calor da solução nas raízes',
    explicacao:
      'Água quente guarda pouco oxigênio, e a raiz sufoca e apodrece. Água fria demais faz a planta absorver menos.',
    exemplo: 'Faixa boa: 18 a 24 °C. Em onda de calor ela sobe devagar, mas demora a baixar.',
    relacionados: ['nft', 'reservatorio'],
  },
  reservatorio: {
    id: 'reservatorio',
    nome: 'Reservatório',
    curto: 'a caixa da solução nutritiva',
    explicacao:
      'Tanque de onde a bomba puxa a solução e para onde ela volta. A planta bebe e a água evapora, então o nível cai e precisa de reposição.',
    exemplo: 'Abaixo de 30% do nível o card fica amarelo; repor água também dilui a EC.',
    relacionados: ['nft', 'ec'],
  },
  turgor: {
    id: 'turgor',
    nome: 'Turgor',
    curto: 'a folha firme, cheia de água',
    explicacao:
      'Pressão da água dentro das células, que mantém a folha esticada. Quando a planta perde mais água do que bebe, o turgor cai e ela murcha.',
    exemplo: 'Tarde quente com VPD acima de 1,5 kPa: a alface murcha mesmo com água na raiz.',
    relacionados: ['vpd'],
  },
  clorose: {
    id: 'clorose',
    nome: 'Clorose',
    curto: 'folha amarelando',
    explicacao:
      'Amarelamento da folha por falta de clorofila. Na hidroponia, quase sempre é nutriente faltando ou preso por pH errado.',
    exemplo: 'pH acima de 6,5 por dias seguidos trava o ferro e as folhas novas amarelam.',
    relacionados: ['ph', 'ec', 'necrose'],
  },
  necrose: {
    id: 'necrose',
    nome: 'Necrose',
    curto: 'tecido da folha morto',
    explicacao:
      'Partes da folha que secam e ficam marrons, porque as células morreram. Na alface aparece muito na borda (queima de ponta), com calor e EC alta.',
    exemplo: 'EC acima de 1,8 mS/cm em dia quente queima a ponta das folhas e derruba o preço.',
    relacionados: ['clorose', 'ec'],
  },
  faixaBoa: {
    id: 'faixaBoa',
    nome: 'Faixa boa',
    curto: 'onde a alface cresce bem',
    explicacao:
      'Intervalo de valores em que a variável não atrapalha a planta. Dentro dela o card fica verde; um pouco fora, amarelo; muito fora, vermelho.',
    exemplo: 'Amarelo vai até 15% da largura da faixa: no pH 5,5 a 6,5, até 6,65.',
    relacionados: ['vpd', 'ph', 'ec'],
  },

  // ---------- quem controla ----------
  agente: {
    id: 'agente',
    nome: 'Agente',
    curto: 'a rede neural que toca a estufa',
    explicacao:
      'O "funcionário" digital: a cada 10 minutos lê os sensores e decide o que ligar. Ninguém escreveu as regras dele; ele aprendeu tentando em milhares de estufas simuladas.',
    relacionados: ['redeNeural', 'regrasFixas', 'camadaSeguranca'],
  },
  regrasFixas: {
    id: 'regrasFixas',
    nome: 'Regras fixas',
    curto: 'o "se passar de X, liga Y"',
    explicacao:
      'Controle como a maioria das estufas faz: limites escritos à mão. É a régua de comparação, porque o agente só vale a pena se ganhar delas no mesmo clima.',
    exemplo: 'Passou de 28 °C, liga o exaustor; caiu de 26 °C, desliga.',
    relacionados: ['agente', 'pid', 'atribuicao'],
  },
  pid: {
    id: 'pid',
    nome: 'PID',
    curto: 'controlador clássico, uma variável por vez',
    explicacao:
      'Corrige olhando o erro de agora, o erro acumulado e a velocidade do erro. Funciona bem para uma variável isolada, mas não pensa no preço da energia nem no efeito de uma ação sobre as outras.',
    relacionados: ['regrasFixas', 'agente'],
  },

  // ---------- rede neural ----------
  redeNeural: {
    id: 'redeNeural',
    nome: 'Rede neural',
    curto: 'contas em camadas que decidem',
    explicacao:
      'Várias camadas de neurônios, cada uma recebendo a saída da anterior. Entram as leituras da estufa e saem as ações; treinar é achar os pesos que dão boas decisões.',
    exemplo: 'A do Genesis: cerca de 20 entradas, 32 e 32 neurônios, 8 saídas.',
    relacionados: ['neuronio', 'mlp', 'peso'],
  },
  neuronio: {
    id: 'neuronio',
    nome: 'Neurônio',
    curto: 'uma conta pequena: soma e entorta',
    explicacao:
      'Multiplica cada entrada por um peso, soma tudo, soma o viés e passa o resultado por uma função de ativação. Sozinho é simples; a força vem de muitos juntos.',
    relacionados: ['peso', 'vies', 'ativacao'],
  },
  peso: {
    id: 'peso',
    nome: 'Peso',
    curto: 'o quanto cada entrada importa',
    explicacao:
      'Número que multiplica uma entrada dentro do neurônio. Peso grande dá muita importância àquela leitura; negativo inverte o efeito. Os pesos são tudo o que a rede sabe.',
    exemplo: 'A rede do Genesis tem cerca de 2 mil pesos.',
    relacionados: ['neuronio', 'vies', 'mutacao'],
  },
  vies: {
    id: 'vies',
    nome: 'Viés',
    curto: 'o empurrão inicial do neurônio',
    explicacao:
      'Número somado depois dos pesos, antes da ativação. Deixa o neurônio responder mesmo com entradas zeradas, como um ponto de partida ajustável.',
    relacionados: ['peso', 'neuronio'],
  },
  ativacao: {
    id: 'ativacao',
    nome: 'Função de ativação',
    curto: 'a curva que entorta a conta',
    explicacao:
      'Transforma a soma do neurônio numa curva. Sem ela, a rede inteira seria uma conta linear e não daria conta de decisões do tipo "depende".',
    relacionados: ['tanh', 'sigmoide', 'neuronio'],
  },
  tanh: {
    id: 'tanh',
    nome: 'tanh',
    curto: 'curva em S de -1 a 1',
    explicacao:
      'Tangente hiperbólica: achata qualquer número para entre -1 e 1. Usada nas camadas do meio, porque aceita sinais positivos e negativos.',
    relacionados: ['ativacao', 'sigmoide'],
  },
  sigmoide: {
    id: 'sigmoide',
    nome: 'Sigmoide',
    curto: 'curva em S de 0 a 1',
    explicacao:
      'Achata qualquer número para entre 0 e 1. Por isso fica na saída: cada atuador recebe uma fração, como 0,7 da potência do exaustor.',
    exemplo: 'Nebulização liga se a saída passar de 0,5.',
    relacionados: ['ativacao', 'saida', 'tanh'],
  },
  mlp: {
    id: 'mlp',
    nome: 'MLP',
    curto: 'rede de camadas totalmente ligadas',
    explicacao:
      'Perceptron de várias camadas: cada neurônio liga em todos da camada seguinte. É pequena de propósito, porque a neuroevolução vai melhor com poucos pesos; não tem memória, então recebe também as leituras de uma hora atrás.',
    exemplo: '20 → 32 → 32 → 8, cerca de 2 mil pesos.',
    relacionados: ['redeNeural', 'neuroevolucao'],
  },
  normalizacao: {
    id: 'normalizacao',
    nome: 'Normalização',
    curto: 'pôr todas as leituras na mesma escala',
    explicacao:
      'Antes de entrar na rede, cada leitura vira um número entre mais ou menos -1 e 1. Assim nenhuma domina só por ser grande.',
    exemplo: 'CO₂ de 800 ppm e pH de 6,0 chegam à rede com o mesmo peso de partida.',
    relacionados: ['entrada'],
  },
  entrada: {
    id: 'entrada',
    nome: 'Entradas',
    curto: 'o que a rede enxerga',
    explicacao:
      'Leituras que a rede recebe a cada passo: ar, solução, clima de fora, hora, tarifa e a tendência da última hora. O formato é o mesmo em todas as fases; o que ainda não existe recebe valor fixo.',
    exemplo: 'Cerca de 20 números; a hora entra como seno e cosseno, para 23h ficar perto de 0h.',
    relacionados: ['normalizacao', 'saida', 'fase'],
  },
  saida: {
    id: 'saida',
    nome: 'Saídas',
    curto: 'o que a rede manda fazer',
    explicacao: 'Uma saída por atuador, cada uma entre 0 e 1. Antes de virar ação, passam pela camada de segurança.',
    exemplo: '8 saídas: exaustor, sombreamento, nebulização, luz, dosagem A/B, ácido, reposição de água e bomba.',
    relacionados: ['sigmoide', 'camadaSeguranca', 'entrada'],
  },

  // ---------- treino ----------
  neuroevolucao: {
    id: 'neuroevolucao',
    nome: 'Neuroevolução',
    curto: 'treinar redes como seleção natural',
    explicacao:
      'Em vez de ensinar a resposta certa a cada passo, que ninguém sabe, cria-se uma população de redes, avalia-se o ciclo inteiro e os melhores geram a próxima geração. Só precisa da nota final.',
    relacionados: ['populacao', 'geracao', 'nota'],
  },
  populacao: {
    id: 'populacao',
    nome: 'População',
    curto: 'todas as redes testadas juntas',
    explicacao:
      'Conjunto de redes da mesma geração, cada uma cuidando da sua estufa simulada. Rodam ao mesmo tempo na placa de vídeo, todas com o mesmo clima.',
    exemplo: '1024 redes, 1024 estufas em paralelo.',
    relacionados: ['geracao', 'semente'],
  },
  geracao: {
    id: 'geracao',
    nome: 'Geração',
    curto: 'uma rodada de teste e seleção',
    explicacao:
      'Cada rede cultiva um ciclo inteiro, recebe a nota e os melhores formam a geração seguinte. O treino repete isso centenas ou milhares de vezes, com clima novo a cada rodada.',
    exemplo: 'Um ciclo de 35 dias são uns 5 mil passos de 10 minutos.',
    relacionados: ['populacao', 'elitismo', 'campeao'],
  },
  elitismo: {
    id: 'elitismo',
    nome: 'Elitismo',
    curto: 'os melhores passam sem mudança',
    explicacao:
      'Uma fração do topo vai intacta para a próxima geração. Garante que a melhor solução achada nunca se perde por azar na mutação.',
    exemplo: 'Com 5% de elite numa população de 1024, cerca de 51 redes passam direto.',
    relacionados: ['geracao', 'mutacao', 'torneio'],
  },
  torneio: {
    id: 'torneio',
    nome: 'Torneio',
    curto: 'sorteia alguns, o melhor vira pai',
    explicacao:
      'Para escolher cada pai, sorteia-se um grupinho da população e o de maior nota vence. Favorece os bons sem descartar de vez os medianos, que podem carregar ideias úteis.',
    exemplo: 'Torneio de 4: sorteia 4 redes e a melhor delas vira pai.',
    relacionados: ['cruzamento', 'elitismo'],
  },
  cruzamento: {
    id: 'cruzamento',
    nome: 'Cruzamento',
    curto: 'filho com pesos de dois pais',
    explicacao:
      'O filho nasce de dois pais escolhidos entre os bons: cada peso vem de um ou do outro. Junta o que cada pai aprendeu.',
    relacionados: ['torneio', 'mutacao', 'peso'],
  },
  mutacao: {
    id: 'mutacao',
    nome: 'Mutação',
    curto: 'ruído pequeno nos pesos do filho',
    explicacao:
      'Soma-se um ruído aleatório pequeno aos pesos depois do cruzamento. É de onde surge comportamento novo; ruído grande demais estraga o que já funcionava.',
    exemplo: 'Desvio de 0,02: um peso de 0,50 costuma virar algo entre 0,48 e 0,52.',
    relacionados: ['cruzamento', 'peso', 'elitismo'],
  },
  nota: {
    id: 'nota',
    nome: 'Nota (fitness)',
    curto: 'quanto a rede rendeu, em R$',
    explicacao:
      'O resultado de um ciclo em reais: alface colhida vezes preço, menos energia, nutriente e água, menos uma punição pelo tempo fora da faixa. É o único sinal que guia a evolução.',
    exemplo: 'Rede que colhe bem mas gasta muita energia no horário de pico pode perder para uma mais econômica.',
    relacionados: ['neuroevolucao', 'faixaBoa', 'tarifaKwh'],
  },
  curriculo: {
    id: 'curriculo',
    nome: 'Currículo',
    curto: 'dificuldade que aumenta aos poucos',
    explicacao:
      'O treino começa fácil e ganha um obstáculo novo a cada fase, como uma escola. Jogar tudo de uma vez faria a rede se perder antes de aprender o básico.',
    exemplo: '6 fases: do ar com sensores perfeitos até bomba travando e queda de energia.',
    relacionados: ['fase', 'misturaFases', 'randomizacaoDominio'],
  },
  fase: {
    id: 'fase',
    nome: 'Fase',
    curto: 'um degrau do currículo',
    explicacao:
      'Cada fase traz um obstáculo novo: solução nutritiva, clima real e tarifa, ruído, sensor descalibrando, falhas. Passa de fase quando o campeão cumpre o critério.',
    exemplo: 'Critério proposto: menos de 5% do tempo fora da faixa e nota maior que a das regras fixas.',
    relacionados: ['curriculo', 'campeao', 'regrasFixas'],
  },
  misturaFases: {
    id: 'misturaFases',
    nome: 'Mistura de fases',
    curto: 'revisar o que já aprendeu',
    explicacao:
      'Depois de avançar, parte dos cenários de cada geração vem das fases anteriores. É a revisão que impede o agente de esquecer o que já sabia.',
    exemplo: '70% de cenários da fase nova e 30% das antigas.',
    relacionados: ['esquecimentoCatastrofico', 'fase'],
  },
  esquecimentoCatastrofico: {
    id: 'esquecimentoCatastrofico',
    nome: 'Esquecimento catastrófico',
    curto: 'aprender o novo e esquecer o velho',
    explicacao:
      'Quando a rede se ajusta só ao desafio novo, os mesmos pesos que sabiam o antigo mudam e ela desaprende. Por isso o campeão refaz as provas das fases anteriores.',
    exemplo: 'Campeão da fase 3 que acerta só 60% da prova da fase 1: esqueceu.',
    relacionados: ['misturaFases', 'campeao'],
  },
  campeao: {
    id: 'campeao',
    nome: 'Campeão',
    curto: 'a melhor rede da geração',
    explicacao:
      'A rede de maior nota numa geração. Seus pesos são salvos e ela é testada em vários climas, para ver se foi competência ou sorte.',
    relacionados: ['geracao', 'gravacao', 'semente'],
  },
  semente: {
    id: 'semente',
    nome: 'Semente',
    curto: 'o número que sorteia o clima',
    explicacao:
      'Número que alimenta o sorteio do clima. Mesma semente, mesmo clima: todas as redes de uma geração enfrentam o mesmo tempo, e a comparação é justa.',
    exemplo: 'Semente 42 sempre gera a mesma onda de calor no mesmo dia do ciclo.',
    relacionados: ['populacao', 'gravacao'],
  },
  gravacao: {
    id: 'gravacao',
    nome: 'Gravação',
    curto: 'o ciclo guardado em dados, não vídeo',
    explicacao:
      'Guarda a semente do clima, o modelo e as ações de cada passo. As ações vão gravadas porque placa de vídeo e navegador arredondam contas de jeitos diferentes.',
    exemplo: 'Um ciclo de 35 dias são uns 5 mil passos gravados.',
    relacionados: ['replay', 'semente', 'campeao'],
  },
  replay: {
    id: 'replay',
    nome: 'Reprodução',
    curto: 'rever o ciclo acelerado',
    explicacao:
      'O dashboard toca a gravação: a alface crescendo, os medidores mexendo e os atuadores ligando. Dá para pôr campeões de gerações diferentes lado a lado.',
    relacionados: ['gravacao'],
  },

  // ---------- mundo real e segurança ----------
  camadaSeguranca: {
    id: 'camadaSeguranca',
    nome: 'Camada de segurança',
    curto: 'limites que o agente não fura',
    explicacao:
      'Filtro fixo entre a rede e os atuadores: nenhuma decisão passa por cima de um limite duro. No simulador só registra a tentativa; no hardware, impede.',
    exemplo: 'Não dosa ácido com pH abaixo de 5,5.',
    relacionados: ['acaoBarrada', 'saida', 'agente'],
  },
  acaoBarrada: {
    id: 'acaoBarrada',
    nome: 'Ação barrada',
    curto: 'ordem perigosa que a segurança segurou',
    explicacao:
      'Quando o agente pede algo fora dos limites, a camada de segurança bloqueia e registra. Poucas barradas indicam que o agente aprendeu a se comportar sozinho.',
    exemplo: 'O agente pediu ácido com pH em 5,4: barrado.',
    relacionados: ['camadaSeguranca'],
  },
  perturbacao: {
    id: 'perturbacao',
    nome: 'Perturbação',
    curto: 'problema injetado de propósito',
    explicacao:
      'Um evento ruim jogado em todas as estufas ao mesmo tempo, para ver quem reage melhor. Testa o agente em situações que o dia comum não traz.',
    exemplo: 'Onda de calor, pH descalibrando, bomba travada, queda de energia, ruído nos sensores, tarifa de pico.',
    relacionados: ['randomizacaoDominio', 'agente'],
  },
  randomizacaoDominio: {
    id: 'randomizacaoDominio',
    nome: 'Randomização de domínio',
    curto: 'treinar num simulador "sujo" de propósito',
    explicacao:
      'O simulador nunca é igual à estufa real. Treinar com ruído, sensores descalibrando e falhas sorteadas ensina o agente a não depender dos detalhes do simulador.',
    exemplo: 'Fases 4 a 6 do currículo.',
    relacionados: ['curriculo', 'perturbacao', 'gemeoDigital'],
  },
  gemeoDigital: {
    id: 'gemeoDigital',
    nome: 'Gêmeo digital',
    curto: 'a estufa copiada no computador',
    explicacao:
      'Simulador que imita uma estufa real e fala com o agente pela mesma interface que os sensores falariam. Quando o hardware existir, os dados reais calibram o simulador.',
    exemplo: 'Um ESP32 com sensores troca o simulador sem mudar uma linha do agente.',
    relacionados: ['randomizacaoDominio', 'agente'],
  },

  // ---------- dinheiro ----------
  pontoEquilibrio: {
    id: 'pontoEquilibrio',
    nome: 'Ponto de equilíbrio',
    curto: 'quanto vender para empatar',
    explicacao:
      'Quantidade de alface (ou preço por pé) em que a receita cobre exatamente todos os custos. Abaixo dele a estufa dá prejuízo; acima, lucro.',
    relacionados: ['margem', 'cenarioPreco'],
  },
  margem: {
    id: 'margem',
    nome: 'Margem',
    curto: 'o que sobra depois dos custos',
    explicacao:
      'Receita menos custos variáveis e fixos, por ciclo. Mostra se a estufa se paga e quanto sobra para o produtor.',
    relacionados: ['pontoEquilibrio', 'tarifaKwh'],
  },
  tarifaKwh: {
    id: 'tarifaKwh',
    nome: 'Tarifa (R$/kWh)',
    curto: 'o preço da energia',
    explicacao:
      'Quanto custa cada quilowatt-hora gasto por exaustor, bomba e luz. Muda com a bandeira e o horário, e o agente aprende a economizar no horário caro sem perder colheita.',
    exemplo: 'Exaustor de 0,5 kW ligado 10 horas gasta 5 kWh.',
    relacionados: ['nota', 'margem'],
  },
  cenarioPreco: {
    id: 'cenarioPreco',
    nome: 'Cenário de preço',
    curto: 'preço baixo, médio ou alto',
    explicacao:
      'O preço da alface muda ao longo do ano, então a conta é feita em três cenários. Ajuda a ver se a estufa se paga mesmo num mês ruim.',
    exemplo: 'Referência: CEAGESP e Conab; todos os preços são editáveis pelo produtor.',
    relacionados: ['pontoEquilibrio', 'margem'],
  },
  atribuicao: {
    id: 'atribuicao',
    nome: 'Atribuição',
    curto: 'de onde vem a diferença em R$',
    explicacao:
      'Separa a vantagem do agente sobre as regras fixas em partes: colheita a mais, energia, nutriente e água a menos. Mostra o porquê do ganho, não só o total.',
    relacionados: ['regrasFixas', 'nota', 'margem'],
  },
}

/** Busca um termo pelo id (o tipo garante que ele existe). */
export function termo(id: IdTermo): Termo {
  return TERMOS[id]
}
