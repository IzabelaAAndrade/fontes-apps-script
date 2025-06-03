function myFunction() {
  
}

function doGet(e) {
  let pagina = e.parameter.pagina || 'visualizar';

    if (pagina === 'cadastrar') {
      return HtmlService.createHtmlOutputFromFile('cadastro_despesas')
        .setTitle('Cadastrar Despesas');
    } else {
      // Como carregar os dados da planilha no webApp
      let planilha = SpreadsheetApp.openById('135pjG8OmRpMeAP848rYfzDgufhao1OeJRFYjMAEEIio');
      let abaDespesas = planilha.getSheetByName('Despesas');
      let despesas = abaDespesas.getDataRange().getValues();
      let tabelaVisualizacao = '<table><tr><th>Data</th><th>Nome</th><th>Valor (R$)</th><th>Categoria</th></tr>'; 

      for(let i = 1; i < despesas.length; i++){
        tabelaVisualizacao += '<tr>'
        for(let j = 0; j < despesas[i].length; j++){
          if(j == 0){ // Exibição da data formatada
            let dataFormatada = Utilities.formatDate(new Date(despesas[i][j]), Session.getScriptTimeZone(), 'dd/MM/yyyy');
            tabelaVisualizacao += `<td>${dataFormatada}</td>`;
          }else{
            tabelaVisualizacao += `<td>${despesas[i][j]}</td>`;
          }
          
        }
        tabelaVisualizacao += '</tr>';
      }

      tabelaVisualizacao += '</table>';

      Logger.log(tabelaVisualizacao);

      let template = HtmlService.createTemplateFromFile('demonstrativo_despesas');
      template.tabelaDespesas = tabelaVisualizacao;

      template.urlBase = 'https://script.google.com/a/macros/usp.br/s/AKfycbxN6EGmXDh2e-qQveFRMQEBRYjlphgUblLQNTiKgUc/exec';
      
      return template.evaluate()
        .setTitle('Cadastro de Despesas');
    }
  }


function doPost(e) {
  let dados = e.parameter;
  let data = dados.data;
  let nome = dados.nome;
  let valor = dados.valor;
  let categoria = dados.categoria;
  let limCategoria = dados.novoLimite;

  //Obter as categorias já existentes na planilha (Questão 2)
  let planilha = SpreadsheetApp.openById('135pjG8OmRpMeAP848rYfzDgufhao1OeJRFYjMAEEIio');
  let abaCategorias = planilha.getSheetByName('Categorias');
  let categorias = abaCategorias.getDataRange().getValues();
  //Caso a categoria não exista, criar uma nova
  let categoriaExiste = false;
  for (let i = 0; i < categorias.length; i++) {
    if (categorias[i][0] === categoria) {
      categoriaExiste = true;
      break;
    }
  }

  if (!categoriaExiste) {
    abaCategorias.appendRow([categoria, parseFloat(limCategoria).toFixed(2)]);
  }

  //Opcional/desafio -> Deixar a data formatada.
  let dataFormatada = Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  Logger.log(dataFormatada);

  //Adicionar a nova despesa na planilha principal (Questão 2)
  let abaDespesas = planilha.getSheetByName('Despesas');
  abaDespesas.appendRow([dataFormatada, nome, parseFloat(valor).toFixed(2), categoria]);

  //Verificar soma de valores por categoria
  let somaPorCategoria = {};
  let despesas = abaDespesas.getDataRange().getValues();
  for (let i = 1; i < despesas.length; i++) {
    let valorAtual = parseFloat(despesas[i][2]);  // coluna valor (índice 2)
    let categoriaAtual = despesas[i][3];          // coluna categoria (índice 3)

    if (!somaPorCategoria[categoriaAtual]) {
      somaPorCategoria[categoriaAtual] = 0;
    }
    somaPorCategoria[categoriaAtual] += valorAtual;
  }

  // Verificar se alguma ultrapassou o limite
  // Monta objeto com os limites das categorias
  let limites = {};
  for (let i = 0; i < categorias.length; i++) {
    let nomeCategoria = categorias[i][0];
    let limiteValor = parseFloat(categorias[i][1]);
    limites[nomeCategoria] = limiteValor;
  }

  // Verificar se passou do limite e mandar e-mail
  let emailUsuario = 'izaandrade@usp.br' // Colocar seu próprio email.

  for (let categoriaAt in somaPorCategoria) {
    let totalGasto = somaPorCategoria[categoriaAt];
    let limiteCategoria = limites[categoriaAt];

    if (limiteCategoria !== undefined && totalGasto > limiteCategoria) {
      let excesso = (totalGasto - limiteCategoria).toFixed(2);
      let mensagem = `Atenção! A categoria "${categoriaAt}" ultrapassou o limite.\n` +
                    `Limite: R$ ${limiteCategoria.toFixed(2)}\n` +
                    `Total gasto: R$ ${totalGasto.toFixed(2)}\n` +
                    `Excesso: R$ ${excesso}`;

      GmailApp.sendEmail(emailUsuario, `Alerta: Categoria ${categoriaAt} ultrapassou o limite!`, mensagem);
      Logger.log(`Email enviado para ${emailUsuario}: ${mensagem}`);
    }
  }

  return HtmlService.createHtmlOutput('Despesa cadastrada com sucesso! <a href="?pagina=visualizar">Voltar</a>');
  
}

