import type { Division } from './Themes';

export type Platform = 'instagram' | 'tiktok' | 'linkedin' | 'youtube';

export interface ContentStructure {
  platform: Platform;
  hooks: string[];
  body: string[];
  cta: string[];
  tags: string[];
}

export interface DivisionContent {
  audience: string;
  platforms: Record<Platform, ContentStructure>;
}

export const CONTENT_TEMPLATES: Record<Division, DivisionContent> = {
  'connect-gray': {
    audience: 'Síndicos, administradoras de condomínios, gestores prediais.',
    platforms: {
      instagram: {
        platform: 'instagram',
        hooks: [
          'A maioria dos síndicos só descobre esse problema quando o elevador para.',
          'Você sabia que 70% dos condomínios pagam mais do que deviam em manutenção?',
          'O erro que faz síndicos perderem dinheiro todo mês (e nem percebem).',
          'Networking entre síndicos pode economizar até 40% nos custos do prédio.',
          'Se você é síndico e não tem uma rede de fornecedores, está perdendo dinheiro.',
        ],
        body: [
          // BRIEFING 10/03/2026 – Preventiva vs Corretiva com dados reais
          `🔴 MANUTENÇÃO CORRETIVA (sem planejamento):\n→ R$4.200 em reparo emergencial de elevador\n→ R$1.800 em encanamento furado às 23h\n→ R$6.000 em curto-circuito na bomba d'agua\n\n✅ MANUTENÇÃO PREVENTIVA (com planejamento):\n→ R$800/mês cobre todos os sistemas\n→ 70% dos condomínios esperam o problema aparecer\n→ Manutenção corretiva custa em média 5x mais\n\nA diferença? Síndicos conectados com a rede certa.`,
          'A Connect Gray reúne os melhores fornecedores verificados em um só lugar.',
          'No Coffee Meet, síndicos trocam experiências e encontram soluções reais.',
          'Comparativo: síndico sozinho vs síndico com rede de apoio — os números falam.',
          'Gestão profissional começa com as conexões certas. Veja como funciona.',
        ],
        cta: [
          'Fale com a Connect Gray e transforme sua gestão.',
          'Participe do próximo Coffee Meet — link na bio!',
          'Comente "QUERO" e receba mais informações.',
          'Entre para a rede de síndicos mais conectada do Brasil.',
          'Salve esse post e compartilhe com seu síndico.',
        ],
        tags: ['condominio', 'sindico', 'gestãopredial', 'coffeemeet', 'connectgray', 'networking']
      },
      tiktok: {
        platform: 'tiktok',
        hooks: [
          'POV: Você é o síndico e o elevador parou na segunda-feira.',
          'Coisas que só quem é síndico entende...',
          'Ninguém te conta isso antes de virar síndico.',
          'O fornecedor sumiu e a assembleia é amanhã. E agora?',
          'Quando o morador reclama mas não vai na assembleia:',
        ],
        body: [
          'Uso de áudio trend com cortes rápidos de situações reais de condomínio.',
          'Dueto com vídeo de "expectativa vs realidade" do dia a dia do síndico.',
          'Storytelling rápido: problema → caos → solução (Coffee Meet).',
          'React a memes de condomínio com dicas profissionais.',
          'Trend "antes e depois" de uma gestão condominial organizada.',
        ],
        cta: [
          'Link na bio para evitar o caos no seu condomínio.',
          'Siga para mais dicas de gestão condominial.',
          'Manda esse vídeo pro seu síndico!',
          'Comenta "EU QUERO" pra receber o guia gratuito.',
          'Salva esse vídeo — você vai precisar.',
        ],
        tags: ['humorcondominial', 'sindico', 'condominio', 'gestao', 'coffeemeet', 'vidasindico']
      },
      linkedin: {
        platform: 'linkedin',
        hooks: [
          'Gestão Técnica de Condomínios: O impacto direto no valor do patrimônio.',
          'O networking profissional está transformando a gestão condominial no Brasil.',
          'Por que os melhores síndicos investem em relacionamento, não só em fornecedores.',
          'Dados mostram: condomínios com gestão em rede economizam 35% ao ano.',
          'A evolução do síndico: de administrador solitário a gestor conectado.',
        ],
        body: [
          'Artigo sobre conformidade técnica e normas ABNT para condomínios.',
          'Case study: como um síndico reduziu custos em 40% com networking estratégico.',
          'Análise de mercado: o crescimento das redes profissionais no setor condominial.',
          'Framework para gestão condominial baseada em dados e conexões qualificadas.',
          'Tendências 2026: o futuro da administração predial e o papel da tecnologia.',
        ],
        cta: [
          'Agende uma consultoria técnica com a Connect Gray.',
          'Conecte-se conosco para receber insights exclusivos.',
          'Comente sua experiência com gestão condominial.',
          'Compartilhe com gestores que precisam ver isso.',
          'Saiba mais no nosso site — link nos comentários.',
        ],
        tags: ['assetmanagement', 'facilitymanagement', 'propertymanagement', 'networking', 'gestãopredial']
      },
      youtube: {
        platform: 'youtube',
        hooks: [
          'Guia Definitivo: Como reduzir custos de condomínio com gestão inteligente.',
          'COFFEE MEET #12 — O que rolou no maior evento de síndicos do mês.',
          'Os 5 maiores erros de síndicos iniciantes (e como evitar cada um).',
          'Como montar uma rede de fornecedores confiáveis para seu condomínio.',
          'Entrevista: Síndico que economizou R$200 mil com as conexões certas.',
        ],
        body: [
          'Vídeo longo (10min) sobre auditoria de contratos de manutenção.',
          'Recap completo do Coffee Meet com depoimentos e bastidores.',
          'Tutorial passo a passo para organizar fornecedores por qualidade e preço.',
          'Mesa redonda com síndicos parceiros compartilhando resultados reais.',
          'Documentário curto sobre a transformação de um condomínio através do networking.',
        ],
        cta: [
          'Inscreva-se no canal Connect Gray e ative o sininho!',
          'Deixe seu like se esse conteúdo foi útil.',
          'Comente qual tema quer ver no próximo vídeo.',
          'Link na descrição para participar do próximo Coffee Meet.',
          'Compartilhe com quem precisa organizar a gestão do prédio.',
        ],
        tags: ['educaçãocondominial', 'gestaopredial', 'sindicoprofissional', 'coffeemeet', 'connectgray']
      }
    }
  },
  'gray-up': {
    audience: 'Condomínios, Construtoras, Empresas, Indústrias.',
    platforms: {
      instagram: {
        platform: 'instagram',
        hooks: [
          'Seu elevador pode estar funcionando errado e você não sabe.',
          'Elevador parado = morador furioso + prejuízo garantido.',
          'O que ninguém te conta sobre modernização de elevadores.',
          'Seu prédio está preparado para carros elétricos?',
          'A conta de energia do seu condomínio pode cair 60%. Veja como.',
        ],
        body: [
          'Destaque para o sistema inteligente de modernização Gray Up.',
          'Antes e depois de uma modernização completa com números reais.',
          'Comparativo: elevador antigo vs modernizado — segurança, energia e custo.',
          'Tour pela obra: cada etapa da modernização explicada de forma visual.',
          'Projeto elétrico entregue: laudo, instalação e economia comprovada.',
        ],
        cta: [
          'Solicite uma avaliação gratuita — link na bio.',
          'Chame no WhatsApp e peça um orçamento sem compromisso.',
          'Comente "ORÇAMENTO" e nossa equipe entra em contato.',
          'Salve esse post para mostrar na próxima assembleia.',
          'Marque o síndico do seu prédio nos comentários.',
        ],
        tags: ['engenharia', 'elevadores', 'modernizacao', 'grayup', 'manutencao', 'projetoeletrico']
      },
      tiktok: {
        platform: 'tiktok',
        hooks: [
          'Como é por dentro de um elevador de alta velocidade.',
          'Satisfying: montando um elevador do zero em 60 segundos.',
          'O barulho estranho no elevador que todo mundo ignora...',
          'POV: Você é o técnico e encontra isso dentro do elevador.',
          'Curiosidade: quantos cabos sustentam um elevador? A resposta surpreende.',
        ],
        body: [
          'Cenas satisfatórias de instalação de peças novas.',
          'Time-lapse da modernização completa de um elevador antigo.',
          'Antes e depois com a trilha sonora viral do momento.',
          'Mini documentário: um dia na vida de um técnico de elevadores.',
          'React: erros absurdos de manutenção que encontramos em obras.',
        ],
        cta: [
          'Siga para mais tecnologia e engenharia.',
          'Comenta o que você achou mais impressionante!',
          'Manda pro síndico do seu prédio ver isso.',
          'Quer ver mais obras? Deixa o like!',
          'Link na bio para orçamento gratuito.',
        ],
        tags: ['tecnologia', 'curiosidades', 'elevador', 'engenharia', 'satisfying', 'obrareal']
      },
      linkedin: {
        platform: 'linkedin',
        hooks: [
          'Inovação em Mobilidade Vertical: Carregadores Veiculares em Empreendimentos.',
          'O mercado de elevadores no Brasil movimenta R$8 bilhões/ano. Sua empresa está nele?',
          'Modernização de elevadores: ROI de 200% em 3 anos com a tecnologia certa.',
          'NR-12 e elevadores: como garantir conformidade e reduzir riscos jurídicos.',
          'Case Gray Up: modernização de 23 elevadores com zero parada não programada.',
        ],
        body: [
          'Case de sucesso em modernização de prédio comercial com ROI documentado.',
          'Análise técnica: por que a manutenção preventiva supera a corretiva em todos os indicadores.',
          'Tendência 2026: carregadores veiculares como diferencial competitivo em empreendimentos.',
          'Framework de decisão: quando modernizar, quando trocar, quando apenas manter.',
          'Dados do projeto Salvador Dalí: cronograma, investimento e resultados alcançados.',
        ],
        cta: [
          'Solicite orçamento para seu projeto — link nos comentários.',
          'Agende uma visita técnica gratuita.',
          'Conecte-se para receber nossos cases e estudos técnicos.',
          'Compartilhe com gestores de facilities da sua rede.',
          'Comente: qual o maior desafio de manutenção no seu empreendimento?',
        ],
        tags: ['realestate', 'mobility', 'greenbuilding', 'elevadores', 'engenharia', 'facilities']
      },
      youtube: {
        platform: 'youtube',
        hooks: [
          'Por dentro da modernização: Como transformamos um elevador de 1980.',
          'OBRA COMPLETA: Modernização de 2 elevadores Otis em 30 dias.',
          'Tutorial: Como avaliar se seu elevador precisa de modernização.',
          'Projeto Elétrico Completo: do laudo à execução em condomínio.',
          'Carregador Veicular em Condomínio: projeto, instalação e resultados.',
        ],
        body: [
          'Time-lapse de obra completa com explicação de cada componente.',
          'Vlog de obra: acompanhe a modernização Salvador Dalí semana a semana.',
          'Tutorial técnico com checklist para síndicos avaliarem seus elevadores.',
          'Documentário: a equipe Gray Up em ação — do planejamento à entrega.',
          'Comparativo real: conta de energia antes e depois da modernização.',
        ],
        cta: [
          'Veja mais cases no nosso site — link na descrição.',
          'Inscreva-se para acompanhar nossas obras.',
          'Deixe seu like e comente qual projeto quer ver.',
          'Link na descrição para orçamento gratuito.',
          'Compartilhe com quem precisa modernizar o elevador.',
        ],
        tags: ['engenhariaeletrica', 'elevadores', 'modernizacao', 'grayup', 'obra']
      }
    }
  },
  'gray-up-flow': {
    audience: 'Empresas, transportadoras, empresários em crescimento.',
    platforms: {
      instagram: {
        platform: 'instagram',
        hooks: [
          'Empresa que cresce sem processo é um castelo de areia.',
          'Sua empresa fatura bem mas o lucro some? O problema está aqui.',
          'O dono preso na operação 14h/dia. Isso tem nome: falta de processo.',
          'Retrabalho custa até 30% do seu faturamento. E você nem percebe.',
          'Se tirar o dono a empresa para? Então ela não é uma empresa.',
        ],
        body: [
          '3 passos para organizar sua operação hoje sem gastar nada.',
          'O método Lean que reduziu desperdício em 30% em 60 dias.',
          'Fluxograma real de um cliente antes e depois da consultoria Flow.',
          'KPIs que todo empresário deveria acompanhar semanalmente.',
          'A diferença entre crescer e escalar — e por que a maioria confunde.',
        ],
        cta: [
          'Fale com a Gray Up Flow e organize sua empresa.',
          'Comente "PROCESSO" para receber nosso guia gratuito.',
          'Link na bio para agendar uma consultoria.',
          'Salve esse post — você vai precisar quando a bagunça bater.',
          'Marque um empresário que precisa ver isso urgente.',
        ],
        tags: ['gestao', 'processos', 'lean', 'business', 'consultoria', 'grayupflow']
      },
      tiktok: {
        platform: 'tiktok',
        hooks: [
          'Minha empresa fatura 1M mas eu não tenho vida.',
          'Quando o dono sai de férias e a empresa para:',
          'Expectativa vs realidade de ter uma empresa.',
          'O empresário que não dorme vs o que tem processos.',
          'Se sua planilha parece com isso, você precisa de ajuda.',
        ],
        body: [
          'Cortes rápidos mostrando o caos vs a organização pós-consultoria.',
          'Storytelling: empresário desesperado → diagnóstico → transformação.',
          'Trend "glow up" mas é a empresa antes e depois do Lean.',
          'React a erros de gestão que vemos todo dia nas consultorias.',
          'Mini aula: 5S explicado em 30 segundos com exemplos reais.',
        ],
        cta: [
          'Clique no link e organize sua vida empresarial.',
          'Siga para mais conteúdo de gestão prática.',
          'Comenta "LEAN" que eu te mando o material.',
          'Manda esse vídeo pro seu sócio!',
          'Salva e assiste quando a bagunça bater.',
        ],
        tags: ['vlogdenegocios', 'empreendedorismo', 'lean', 'gestao', 'processos', 'empresario']
      },
      linkedin: {
        platform: 'linkedin',
        hooks: [
          'Escalabilidade Operacional: O gargalo silencioso das empresas em crescimento.',
          'Por que 67% das PMEs brasileiras não sobrevivem 5 anos? A resposta é processo.',
          'Lean Manufacturing não é modismo. É sobrevivência.',
          'Case: como uma transportadora triplicou o lucro em 6 meses.',
          'A diferença entre gestor operacional e gestor estratégico está em uma palavra: processo.',
        ],
        body: [
          'Liderança e cultura empresarial baseada em processos documentados.',
          'Framework completo de implantação Lean em PMEs: do diagnóstico ao resultado.',
          'Análise de caso: redução de 30% em desperdício com ROI em 90 dias.',
          'Os 5 sinais de que sua empresa precisa de uma reestruturação operacional.',
          'Como construir uma empresa que funciona sem o dono — metodologia prática.',
        ],
        cta: [
          'Conheça nossa metodologia de implantação — link nos comentários.',
          'Agende um diagnóstico gratuito para sua empresa.',
          'Conecte-se e receba insights semanais sobre gestão.',
          'Compartilhe com empresários da sua rede.',
          'Comente: qual o maior gargalo da sua operação hoje?',
        ],
        tags: ['operatingmodel', 'scalingup', 'management', 'lean', 'consultoria', 'processos']
      },
      youtube: {
        platform: 'youtube',
        hooks: [
          'Masterclass: Como estruturar sua empresa para faturar sem depender de você.',
          'CASE COMPLETO: Transportadora que triplicou o lucro em 6 meses.',
          'Workshop Lean Manufacturing: aula completa para empresários.',
          'O Diagnóstico que todo empresário deveria fazer (template grátis).',
          'Fluxograma na prática: como mapear TODOS os processos da sua empresa.',
        ],
        body: [
          'Aula estratégica completa sobre fluxograma e KPIs operacionais.',
          'Documentário: antes e depois de uma empresa após consultoria Gray Up Flow.',
          'Live com empresários que passaram pela transformação Lean.',
          'Tutorial: como montar seu primeiro fluxograma em 30 minutos.',
          'Série: 5 episódios mostrando a implantação Lean do zero.',
        ],
        cta: [
          'Acesse nossa consultoria — link na descrição.',
          'Inscreva-se para mais conteúdo de gestão empresarial.',
          'Deixe seu like se esse conteúdo fez sentido.',
          'Baixe o template gratuito — link na descrição.',
          'Comente qual tema quer ver na próxima aula.',
        ],
        tags: ['gestaoempresarial', 'processos', 'lean', 'consultoria', 'grayupflow']
      }
    }
  },
  'gray-art': {
    audience: 'Empresas, marcas, profissionais liberais.',
    platforms: {
      instagram: {
        platform: 'instagram',
        hooks: [
          'Postar não é marketing. E sua marca está invisível.',
          'Sua concorrência tem design profissional. E você?',
          '3 erros visuais que fazem sua empresa parecer amadora.',
          'A diferença entre marca de R$10 e marca de R$10 mil está no branding.',
          'Se o cliente não lembra da sua marca em 3 segundos, você perdeu.',
        ],
        body: [
          'Branding: A diferença entre preço e valor — com exemplos reais.',
          'Antes e depois de um rebranding completo com resultados de vendas.',
          'As 5 regras de design que toda marca profissional segue.',
          'Como construir um feed que vende: estratégia por trás de cada post.',
          'Paleta de cores, tipografia e posicionamento — o tripé da identidade visual.',
        ],
        cta: [
          'Posicione sua marca — fale com a Gray ART.',
          'Comente "MARCA" para receber uma análise gratuita.',
          'Link na bio para transformar sua identidade visual.',
          'Salve esse post como referência para seu próximo projeto.',
          'Marque uma empresa que precisa de um rebranding urgente.',
        ],
        tags: ['branding', 'marketing', 'socialmedia', 'design', 'identidadevisual', 'grayart']
      },
      tiktok: {
        platform: 'tiktok',
        hooks: [
          '3 erros de design que matam sua marca.',
          'Transformei essa marca em 24 horas. Veja o resultado.',
          'O logo que custou R$50 vs o que custou R$5.000.',
          'POV: O designer vê a marca do cliente pela primeira vez.',
          'Tendências de design 2026 que você PRECISA conhecer.',
        ],
        body: [
          'Antes e depois de uma identidade visual com trilha trend.',
          'Process reel: criando um logo do briefing à arte final.',
          'React a logos ruins e mostrando como ficaria profissional.',
          'Trend "glow up" aplicado em marcas reais de clientes.',
          'Mini tutorial: como escolher cores que vendem para sua marca.',
        ],
        cta: [
          'Contrate a Gray ART — link na bio.',
          'Siga para mais conteúdo de design e branding.',
          'Comenta "LOGO" que te mando referências.',
          'Manda pro amigo que tem uma marca feia!',
          'Salva esse vídeo pra usar de referência.',
        ],
        tags: ['design', 'trendbranding', 'logo', 'identidadevisual', 'antesedepois', 'grayart']
      },
      linkedin: {
        platform: 'linkedin',
        hooks: [
          'Personal Branding para Executivos: A nova moeda do mercado.',
          'Por que empresas investem R$100 mil em branding? Porque funciona.',
          'O posicionamento visual vale mais que 1.000 posts sem estratégia.',
          'Case: como uma marca consistente aumentou as vendas em 150%.',
          'Design não é estética. É estratégia de negócio.',
        ],
        body: [
          'Artigo sobre autoridade e posicionamento digital para líderes.',
          'Case study: o impacto financeiro de um rebranding bem executado.',
          'Framework de identidade visual para empresas em crescimento.',
          'A psicologia das cores aplicada à conversão de vendas.',
          'Como grandes marcas constroem confiança visual — e como replicar.',
        ],
        cta: [
          'Transforme sua imagem profissional — link nos comentários.',
          'Agende uma análise de marca gratuita.',
          'Conecte-se para insights semanais de branding.',
          'Compartilhe com gestores de marketing da sua rede.',
          'Comente: sua marca transmite o que você quer?',
        ],
        tags: ['personalbranding', 'thoughtleadership', 'executivepresence', 'design', 'marketing']
      },
      youtube: {
        platform: 'youtube',
        hooks: [
          'A Ciência do Branding: Como as grandes marcas dominam o subconsciente.',
          'PROCESSO COMPLETO: Criando uma identidade visual do zero.',
          'Tutorial: Como criar um feed de Instagram que vende.',
          'Tendências de Design 2026 — O que vai dominar o mercado visual.',
          'Rebranding ao vivo: transformando uma marca em tempo real.',
        ],
        body: [
          'Análise semiótica de marcas famosas com insights aplicáveis.',
          'Documentário: o processo criativo por trás de um projeto de branding.',
          'Tutorial completo de design para não-designers: ferramentas e técnicas.',
          'Série: criando a identidade visual de uma startup do zero ao lançamento.',
          'Live de portfólio review: analisando marcas dos inscritos.',
        ],
        cta: [
          'Inscreva-se para dominar o marketing visual.',
          'Deixe seu like se aprendeu algo novo.',
          'Link na descrição para orçamento de identidade visual.',
          'Comente sua marca que analisamos no próximo vídeo.',
          'Compartilhe com quem precisa de um rebranding.',
        ],
        tags: ['marketingdigital', 'branding', 'design', 'identidadevisual', 'grayart']
      }
    }
  }
};
