$(document).ready(function () {
    
    // Caminho do arquivo XML de dados da estação meteorológica
    const xmlSource = "dados_estacao.xml";

    // ==========================================
    // CARREGAMENTO DE DADOS (AJAX e XML)
    // ==========================================
    function carregarDadosMeteorologicos() {
        $.ajax({
            type: "GET",
            url: xmlSource,
            dataType: "xml",
            success: function (xml) {
                processarDados(xml);
            },
            error: function () {
                console.warn("Arquivo XML não encontrado. Executando simulação de dados para fins de desenvolvimento.");
                gerarDadosSimulados();
            }
        });
    }

    // Processa a árvore XML e distribui os dados nos componentes
    function processarDados(xml) {
        // Captura da leitura atual (Tempo Real)
        let temperatura = parseFloat($(xml).find("leitura_atual temperatura").text());
        let umidade = parseFloat($(xml).find("leitura_atual umidade").text());
        let chuva = parseFloat($(xml).find("leitura_atual precipitacao").text());
        let vento = parseFloat($(xml).find("leitura_atual vento").text());

        atualizarInterface(temperatura, umidade, chuva, vento);

        // Captura do Histórico para montar o Histograma
        let historicoContainer = $("#histograma-temp");
        historicoContainer.empty(); // Limpa as barras anteriores

        $(xml).find("historico leitura").each(function () {
            let hora = $(this).find("hora").text();
            let tempHist = parseFloat($(this).find("temperatura").text());
            
            // Renderiza o elemento visual da coluna
            let alturaBarra = (tempHist / 50) * 100; // Mapeamento proporcional (máx 50°C)
            let colunaHtml = `
                <div class="hist-column">
                    <div class="hist-bar" style="height: ${alturaBarra}%">
                        <span>${tempHist}°</span>
                    </div>
                    <div class="hist-time">${hora}</div>
                </div>
            `;
            historicoContainer.append(colunaHtml);
        });
    }

    // Alimenta os elementos HTML com os valores processados
    function atualizarInterface(temp, umid, chuva, vento) {
        // 1. Números Digitais
        $("#val-temp").text(temp.toFixed(1));
        $("#val-umid").text(umid);
        $("#val-chuva").text(chuva.toFixed(1));
        $("#val-vento").text(vento.toFixed(1));

        // 2. Gráficos de Medição (Gauges por barras de preenchimento)
        let percentualTemp = (temp / 50) * 100; // Limite de 50 graus
        $("#gauge-temp").css("width", percentualTemp + "%");
        $("#gauge-umid").css("width", umid + "%");

        // 4. Comparação de Dados Simultâneos
        $("#comp-bar-chuva").css("width", (chuva * 2) + "%"); // Fator de escala para visualização
        $("#comp-txt-chuva").text(chuva + "mm");
        
        $("#comp-bar-temp").css("width", (temp * 2) + "%");
        $("#comp-txt-temp").text(temp + "°C");
    }

    // Fallback: Gera dados aleatórios coerentes se o XML não estiver acessível
    function gerarDadosSimulados() {
        let mockXml = `<?xml version="1.0" encoding="UTF-8"?>
        <estacao>
            <leitura_atual>
                <temperatura>26.4</temperatura>
                <umidade>72</umidade>
                <precipitacao>12.5</precipitacao>
                <vento>18.2</vento>
            </leitura_atual>
            <historico>
                <leitura><hora>12:00</hora><temperatura>22.1</temperatura></leitura>
                <leitura><hora>14:00</hora><temperatura>25.4</temperatura></leitura>
                <leitura><hora>16:00</hora><temperatura>28.9</temperatura></leitura>
                <leitura><hora>18:00</hora><temperatura>26.4</temperatura></leitura>
            </historico>
        </estacao>`;
        
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(mockXml, "text/xml");
        processarDados(xmlDoc);
    }

    // Executa a leitura inicial de dados
    carregarDadosMeteorologicos();
    // Atualiza automaticamente os dados do XML a cada 30 segundos
    setInterval(carregarDadosMeteorologicos, 30000);


    // ==========================================
    // 6. GESTÃO E NAVEGAÇÃO (Menu / Painel Administrativo)
    // ==========================================
    $("#btn-admin").click(function () {
        $("#admin-panel").toggleClass("hidden");
        $(this).toggleClass("active-btn");
    });

    // Controladores de Alternância na Área Administrativa (Ativar/Desativar blocos)
    $(".btn-toggle").each(function() {
        let targetId = $(this).data("target");
        // Se o elemento está visível, adiciona classe ativa no botão correspondente
        if (!$(`#${targetId}`).hasClass("hidden")) {
            $(this).addClass("active-btn");
        }
    });

    $(".btn-toggle").click(function () {
        let targetId = $(this).data("target");
        $(`#${targetId}`).toggleClass("hidden");
        $(this).toggleClass("active-btn");
    });


    // ==========================================
    // 7. PAINEL FLEXÍVEL (Controle de Ordem e Remoção)
    // ==========================================
    
    // Ação do Botão Fechar (Remover Bloco do Painel)
    $(document).on("click", ".btn-close", function () {
        let card = $(this).closest(".widget-card");
        let cardId = card.attr("id");
        
        card.addClass("hidden"); // Oculta o elemento da visualização
        
        // Sincroniza o botão correspondente no menu administrativo
        $(`.btn-toggle[data-target="${cardId}"]`).removeClass("active-btn");
    });

    // Mover Bloco para Cima (Alterar Ordem)
    $(document).on("click", ".btn-move-up", function () {
        let currentCard = $(this).closest(".widget-card");
        let previousCard = currentCard.prev(".widget-card");
        
        if (previousCard.length > 0) {
            currentCard.insertBefore(previousCard);
        }
    });

    // Mover Bloco para Baixo (Alterar Ordem)
    $(document).on("click", ".btn-move-down", function () {
        let currentCard = $(this).closest(".widget-card");
        let nextCard = currentCard.next(".widget-card");
        
        if (nextCard.length > 0) {
            currentCard.insertAfter(nextCard);
        }
    });
});