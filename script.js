let perguntas = [];
let perguntasDisponiveis = [];
let indiceAtual = 0;
let pontuacaoBloco = 0; 
let acertosPorCategoriaBloco = {}; 
let bloqueado = false;
let blocoAtual = 0;
const PERGUNTAS_POR_BLOCO = 30;
let resultadosPorBloco = []; 
let resultadosFinaisPorCategoria = {}; 
let perguntasOriginaisCarregadas = []; 

// Função de embaralhamento
function embaralhar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    let temp = copia[i];
    copia[i] = copia[j];
    copia[j] = temp;
  }
  return copia;
}

// Carrega e embaralha perguntas e alternativas
async function carregarPerguntas() {
  try {
    // Se for a primeira carga ou reiniciar o quiz completo, busca as perguntas
    if (perguntasOriginaisCarregadas.length === 0 || (blocoAtual === 0 && resultadosPorBloco.length === 0)) {
        const res = await fetch('perguntas.json?v=' + Date.now());

        if (!res.ok) {
            const errorText = `Erro HTTP: ${res.status} - ${res.statusText}`;
            console.error("Erro ao carregar perguntas: Falha na requisição. " + errorText);
            document.getElementById('pergunta').textContent = "Erro ao carregar perguntas: " + errorText;
            document.getElementById('total-perguntas-info').textContent = "";
            document.getElementById('progress-bar').style.width = '0%'; // Limpa a barra
            document.getElementById('progress-text').textContent = ''; // Limpa o texto
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            console.error("Erro ao carregar perguntas: O arquivo JSON não é um array válido ou está vazio.");
            document.getElementById('pergunta').textContent = "Erro ao carregar perguntas: Dados inválidos no arquivo.";
            document.getElementById('total-perguntas-info').textContent = "";
            document.getElementById('progress-bar').style.width = '0%'; // Limpa a barra
            document.getElementById('progress-text').textContent = ''; // Limpa o texto
            return;
        }
        perguntasOriginaisCarregadas = embaralhar(data); // Guarda uma cópia original embaralhada
    }
    
    // Resetar para um novo quiz completo
    perguntasDisponiveis = [...perguntasOriginaisCarregadas]; // Cria uma nova cópia embaralhada para o quiz
    blocoAtual = 0;
    resultadosPorBloco = [];
    resultadosFinaisPorCategoria = {}; // Reseta os resultados gerais por categoria

    // Inicializa resultados acumulados por categoria para o quiz completo
    const todasCategorias = new Set();
    perguntasOriginaisCarregadas.forEach(q => { // Usa as perguntas originais para pegar todas as categorias
      if (q.categoria) {
        todasCategorias.add(q.categoria);
      }
    });
    todasCategorias.forEach(cat => {
      resultadosFinaisPorCategoria[cat] = { acertos: 0, erros: 0, total: 0 }; // Adicionado 'erros'
    });

    const totalPerguntasQuiz = perguntasDisponiveis.length;
    document.getElementById('total-perguntas-info').textContent = `Total de perguntas no quiz: ${totalPerguntasQuiz}`;

    iniciarNovoBloco();

  } catch (erro) {
    console.error("Erro fatal ao carregar ou processar perguntas:", erro);
    document.getElementById('pergunta').textContent = "Erro ao carregar perguntas. Verifique o console para detalhes.";
    document.getElementById('total-perguntas-info').textContent = "";
    document.getElementById('progress-bar').style.width = '0%'; // Limpa a barra
    document.getElementById('progress-text').textContent = ''; // Limpa o texto
  }
}

// Inicia um novo bloco de perguntas
function iniciarNovoBloco() {
  if (perguntasDisponiveis.length === 0) {
    mostrarResultadoFinalDoQuiz();
    return;
  }

  let numPerguntasParaBloco = PERGUNTAS_POR_BLOCO;
  if (perguntasDisponiveis.length < PERGUNTAS_POR_BLOCO) {
    numPerguntasParaBloco = perguntasDisponiveis.length;
  }

  // Reseta pontuação do bloco e categorias do bloco
  pontuacaoBloco = 0;
  acertosPorCategoriaBloco = {};
  
  // Assegura que todas as categorias do quiz completo sejam inicializadas para o bloco atual
  for (const cat in resultadosFinaisPorCategoria) {
      acertosPorCategoriaBloco[cat] = { acertos: 0, erros: 0, total: 0 }; // Adicionado 'erros'
  }

  perguntas = perguntasDisponiveis.splice(0, numPerguntasParaBloco);

  perguntas = perguntas.map(q => {
    const letras = Object.keys(q.alternativas);
    const alternativasArray = letras.map(letra => ({
      letra,
      texto: q.alternativas[letra]
    }));

    const embaralhadas = embaralhar(alternativasArray);

    const novasAlternativas = {};
    let novaCorreta = '';

    embaralhadas.forEach((alt, i) => {
      const novaLetra = String.fromCharCode(65 + i);
      novasAlternativas[novaLetra] = alt.texto;
      if (alt.letra === q.correta) {
        novaCorreta = novaLetra;
      }
    });

    return {
      ...q,
      alternativas: novasAlternativas,
      correta: novaCorreta
    };
  });

  indiceAtual = 0;
  document.getElementById('quiz').style.display = 'block';
  document.getElementById('resultado').style.display = 'none';
  document.getElementById('feedback').textContent = '';
  document.getElementById('explicacaoGPT').innerHTML = '';
  document.getElementById('explicacaoGPT').style.display = 'none';
  document.getElementById('proxima').style.display = 'none';

  const proximoBlocoBtn = document.getElementById('proximoBloco');
  if (proximoBlocoBtn) {
    proximoBlocoBtn.style.display = 'none';
  }
  const reiniciarBlocoBtn = document.getElementById('reiniciarBloco');
  if (reiniciarBlocoBtn) {
    reiniciarBlocoBtn.style.display = 'none';
  }
  const reiniciarQuizBtn = document.getElementById('reiniciarQuiz');
  if (reiniciarQuizBtn) {
    reiniciarQuizBtn.style.display = 'none';
  }
  const reiniciarQuizCompletoBtn = document.getElementById('reiniciarQuizCompleto');
  if (reiniciarQuizCompletoBtn) {
    reiniciarQuizCompletoBtn.style.display = 'none';
  }

  mostrarPergunta();
}

// Exibe a pergunta atual no DOM e ATUALIZA A BARRA DE PROGRESSO
function mostrarPergunta() {
  bloqueado = false;
  const q = perguntas[indiceAtual];
  const totalPerguntasNoBloco = perguntas.length;

  document.getElementById('pergunta').textContent = `Bloco ${blocoAtual + 1} - Pergunta ${indiceAtual + 1} de ${totalPerguntasNoBloco}: ${q.pergunta}`;

  const opcoes = document.getElementById('opcoes');
  opcoes.innerHTML = '';
  document.getElementById('feedback').textContent = '';
  document.getElementById('explicacaoGPT').innerHTML = '';
  document.getElementById('explicacaoGPT').style.display = 'none';
  document.getElementById('proxima').style.display = 'none';

  for (let [letra, texto] of Object.entries(q.alternativas)) {
    const btn = document.createElement('button');
    btn.textContent = `${letra}) ${texto}`;
    btn.disabled = false;
    btn.onclick = () => verificarResposta(letra);
    const li = document.createElement('li');
    li.appendChild(btn);
    opcoes.appendChild(li);
  }

  // ATUALIZA A BARRA DE PROGRESSO
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  if (progressBar && progressText) {
    const porcentagemConcluida = ((indiceAtual + 1) / totalPerguntasNoBloco) * 100;
    progressBar.style.width = `${porcentagemConcluida}%`;
    progressText.textContent = `${indiceAtual + 1} de ${totalPerguntasNoBloco}`;
  }
}

// Verifica se a resposta selecionada está correta
function verificarResposta(selecionada) {
  if (bloqueado) return;
  bloqueado = true;

  const q = perguntas[indiceAtual];
  const correta = q.correta;
  const categoria = q.categoria || 'Não Categorizado'; // Pega a categoria ou define como 'Não Categorizado'
  const feedback = document.getElementById('feedback');
  const botoes = document.querySelectorAll('#opcoes button');

  botoes.forEach(btn => btn.disabled = true);

  // Atualiza contadores para o bloco atual
  if (!acertosPorCategoriaBloco[categoria]) {
    acertosPorCategoriaBloco[categoria] = { acertos: 0, erros: 0, total: 0 }; // Adicionado 'erros'
  }
  acertosPorCategoriaBloco[categoria].total++;

  // Atualiza contadores para o quiz completo
  if (!resultadosFinaisPorCategoria[categoria]) { // Garante que a categoria existe no total geral
      resultadosFinaisPorCategoria[categoria] = { acertos: 0, erros: 0, total: 0 }; // Adicionado 'erros'
  }
  resultadosFinaisPorCategoria[categoria].total++;

  if (selecionada === correta) {
    feedback.textContent = '✅ Correto!';
    pontuacaoBloco++;
    acertosPorCategoriaBloco[categoria].acertos++;
    resultadosFinaisPorCategoria[categoria].acertos++;
  } else {
    feedback.textContent = `❌ Errado. Resposta correta: ${correta}) ${q.alternativas[correta]}`;
    mostrarExplicacao(q.explicacao);
    acertosPorCategoriaBloco[categoria].erros++; // Incrementa erros
    resultadosFinaisPorCategoria[categoria].erros++; // Incrementa erros
  }

  document.getElementById('proxima').style.display = 'inline-block';
}

// Exibe a explicação da questão
function mostrarExplicacao(texto) {
  const div = document.getElementById('explicacaoGPT');
  div.innerHTML = `<strong>🧠 Explicação:</strong><br>${texto}`;
  div.style.display = 'block';
}

// Ação ao clicar no botão "Próxima"
document.getElementById('proxima').onclick = () => {
  indiceAtual++;
  if (indiceAtual < perguntas.length) {
    mostrarPergunta();
  } else {
    mostrarResultadoFinalDoBloco();
  }
};

// Exibe a tela de resultado final do BLOCO
function mostrarResultadoFinalDoBloco() {
  document.getElementById('quiz').style.display = 'none';

  const totalBloco = perguntas.length;
  const percentualBloco = (pontuacaoBloco / totalBloco) * 100;
  const aprovadoBloco = percentualBloco >= 70;

  resultadosPorBloco.push({
    bloco: blocoAtual + 1,
    pontuacao: pontuacaoBloco,
    total: totalBloco,
    percentual: percentualBloco,
    aprovado: aprovadoBloco,
    detalheCategorias: { ...acertosPorCategoriaBloco } // Salva o detalhe das categorias para este bloco
  });

  const resultado = document.getElementById('resultado');
  // Remova as classes de cor do container principal, a cor será aplicada apenas ao texto de status
  resultado.className = 'resultado'; 
  
  let resumoHTML = `
    <h2>🎯 Fim do Bloco ${blocoAtual + 1}!</h2>
    <p>Você acertou <strong>${pontuacaoBloco}</strong> de <strong>${totalBloco}</strong> perguntas neste bloco.</p>
    <p class="${aprovadoBloco ? 'status-aprovado' : 'status-reprovado'}">
      <strong>${aprovadoBloco ? '✅ Você foi aprovado neste bloco!' : '❌ Você foi reprovado neste bloco. Revise e tente novamente.'}</strong>
    </p>
    
    <h3>Performance por Categoria (Neste Bloco):</h3>
    <table class="tabela-resumo-categorias">
      <thead>
        <tr>
          <th>Categoria</th>
          <th>Acertos</th>
          <th>Erros</th> <th>Total</th>
          <th>% Acerto</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Ordena as categorias alfabeticamente para exibição consistente
  const categoriasOrdenadas = Object.keys(acertosPorCategoriaBloco).sort();

  categoriasOrdenadas.forEach(cat => {
    const dados = acertosPorCategoriaBloco[cat];
    // Garante que a categoria tem perguntas antes de calcular o percentual
    const percentualCat = dados.total > 0 ? (dados.acertos / dados.total) * 100 : 0; 
    resumoHTML += `
          <tr>
            <td>${cat}</td>
            <td>${dados.acertos}</td>
            <td>${dados.erros}</td> <td>${dados.total}</td>
            <td class="porcentagem-categoria">${percentualCat.toFixed(2)}%</td>
          </tr>
    `;
  });

  resumoHTML += `
      </tbody>
    </table>
    <div class="botoes-resultado">
      <button id="proximoBloco">Próximo Bloco</button>
      <button id="reiniciarBloco">Reiniciar Bloco Atual</button>
      <button id="reiniciarQuiz">Reiniciar Quiz Completo</button>
    </div>
  `;
  resultado.innerHTML = resumoHTML;
  resultado.style.display = 'block';

  // Limpa a barra de progresso ao fim do bloco
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = '';

  document.getElementById('proximoBloco').onclick = () => {
    blocoAtual++;
    if (perguntasDisponiveis.length > 0) {
      iniciarNovoBloco();
    } else {
      mostrarResultadoFinalDoQuiz();
    }
  };

  document.getElementById('reiniciarBloco').onclick = () => {
    blocoAtual = 0; // Reinicia o contador de blocos
    resultadosPorBloco = []; // Zera os resultados dos blocos
    carregarPerguntas(); // Recarrega todas as perguntas e inicia o primeiro bloco
  };

  document.getElementById('reiniciarQuiz').onclick = () => {
    blocoAtual = 0;
    resultadosPorBloco = [];
    carregarPerguntas();
  };
}

// Exibe a tela de resultado final do QUIZ COMPLETO
function mostrarResultadoFinalDoQuiz() {
  document.getElementById('quiz').style.display = 'none';
  const resultado = document.getElementById('resultado');

  resultado.className = 'resultado';
  let resumoHTML = `
    <h2>🎉 Quiz Completo!</h2>
    <p>Você concluiu todos os blocos do quiz.</p>
    
    <h3>Performance Consolidada por Categoria:</h3>
    <table class="tabela-resumo-categorias">
      <thead>
        <tr>
          <th>Categoria</th>
          <th>Acertos</th>
          <th>Erros</th> <th>Total</th>
          <th>% Acerto</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Ordena as categorias alfabeticamente para exibição consistente
  const categoriasFinaisOrdenadas = Object.keys(resultadosFinaisPorCategoria).sort();

  categoriasFinaisOrdenadas.forEach(cat => {
    const dados = resultadosFinaisPorCategoria[cat];
    // Garante que a categoria tem perguntas antes de calcular o percentual
    const percentualCat = dados.total > 0 ? (dados.acertos / dados.total) * 100 : 0;
    resumoHTML += `
          <tr>
            <td>${cat}</td>
            <td>${dados.acertos}</td>
            <td>${dados.erros}</td> <td>${dados.total}</td>
            <td class="porcentagem-categoria">${percentualCat.toFixed(2)}%</td>
          </tr>
    `;
  });

  resumoHTML += `
      </tbody>
    </table>
    
    <h3>Performance Detalhada por Bloco:</h3>
    <table class="tabela-resumo-blocos">
      <thead>
        <tr>
          <th>Bloco</th>
          <th>Acertos</th>
          <th>Total</th>
          <th>% Aprovação</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (resultadosPorBloco.length === 0) {
    resumoHTML += `<tr><td colspan="5">Nenhum bloco foi concluído.</td></tr>`;
  } else {
    resultadosPorBloco.forEach(res => {
      const statusClass = res.aprovado ? 'aprovado-linha' : 'reprovado-linha';
      const statusTexto = res.aprovado ? 'Aprovado' : 'Reprovado';
      resumoHTML += `
            <tr class="${statusClass}">
              <td>${res.bloco}</td>
              <td>${res.pontuacao}</td>
              <td>${res.total}</td>
              <td class="porcentagem-aprovacao-bloco">${res.percentual.toFixed(2)}%</td>
              <td>${statusTexto}</td>
            </tr>
      `;
    });
  }

  resumoHTML += `
      </tbody>
    </table>
    <div class="botoes-resultado">
        <button id="reiniciarQuizCompleto">Reiniciar Quiz Completo</button>
    </div>
  `;
  resultado.innerHTML = resumoHTML;
  resultado.style.display = 'block';

  // Limpa a barra de progresso quando o quiz completo é exibido
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = '';

  document.getElementById('reiniciarQuizCompleto').onclick = () => {
    blocoAtual = 0;
    resultadosPorBloco = [];
    carregarPerguntas();
  };
}

// Inicia o carregamento das perguntas quando o script é executado
carregarPerguntas();