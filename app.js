$(document).ready(function () {
    
    // Configurações locais de conexão com o servidor Java do professor
    const SERVER_URL = "http://localhost:8080";
    const USUARIO = "admin";
    const SENHA = "123456";
    
    let tokenSessao = null;
    let historicoTemperatura = [];
    const MAX_HISTORICO = 5;

    // ============================================================
    // GERENCIADOR DE CONEXÃO E MONITORAMENTO VIA API
    // ============================================================
    
    function gerenciarCicloSistema() {
        // Se não possui token, inicia o processo de autenticação (Login)
        if (!tokenSessao) {
            $.ajax({
                type: "GET",
                url: `${SERVER_URL}/aut`,
                data: { usuario: USUARIO, senha: SENHA },
                timeout: 2000, // Tempo limite de 2 segundos para detectar servidor desligado
                cache: false,  // Impede que o navegador use dados em cache
                success: function (resposta) {
                    if (resposta.startsWith("1")) {
                        let partes = resposta.split("TOKEN=");
                        tokenSessao = partes[1].trim();
                        
                        // Altera visualmente o status para conectado
                        $("#val-status").text("Conectado").css("color", "#10b981");
                        console.log("Autenticação bem-sucedida. Token ativo:", tokenSessao);
                        
                        // Dispara a leitura imediata das portas dos sensores
                        executarLeituraSensores();
                    } else {
                        marcarComoOffline();
                    }
                },
                error: function () {
                    // Entra aqui se o servidor Java estiver desligado ou inacessível
                    marcarComoOffline();
                }
            });
        } else {
            // Se já possui token ativo, faz apenas a leitura dos sensores
            executarLeituraSensores();
        }
    }

    // Requisição AJAX individual por sensor exigido
    function puxarDadosSensor(idSensor) {
        return $.ajax({
            type: "GET",
            url: `${SERVER_URL}/get`,
            data: { token: tokenSessao, sensor: idSensor },
            timeout: 2000,
            cache: false
        }).then(function(resposta) {
            if (resposta.startsWith("v")) {
                return parseInt(resposta.substring(1), 10); // Retorna o valor bruto (0-4095)
            }
            // Se a sessão expirou no servidor (Erro -3), limpa o token localmente
            if (resposta === "-3") {
                tokenSessao = null;
            }
            throw new Error(`Código de rejeição da API: ${resposta}`);
        });
    }

    // Consulta os 3 sensores em paralelo
    function executarLeituraSensores() {
        $.when(
            puxarDadosSensor("a1"), // Temperatura
            puxarDadosSensor("a2"), // Pressão
            puxarDadosSensor("a3")  // Luminosidade
        ).done(function(brutoA1, brutoA2, brutoA3) {
            
            // Força a exibição do status conectado e verde a cada resposta com sucesso
            $("#val-status").text("Conectado").css("color", "#10b981");

            // Conversão matemática padrão dos dados analógicos de 12 bits para unidades reais
            let temperatura = ((brutoA1 / 4095) * 60) - 10;   // Escala: -10°C a +50°C
            let pressao = 950 + ((brutoA2 / 4095) * 100);       // Escala: 950 hPa a 1050 hPa
            let luminosidade = (brutoA3 / 4095) * 1000;         // Escala: 0 a 1000 lux

            // Transmite os dados reais coletados para os medidores e caixas
            atualizerInterface(temperatura, pressao, luminosidade);

        }).fail(function(erro) {
            console.warn("A requisição dos sensores falhou. O servidor pode ter sido desativado.");
            marcarComoOffline();
        });
    }

    // ==========================================
    // TRATAMENTO EXCLUSIVO DE DESCONEXÃO (OFFLINE)
    // ==========================================
    function marcarComoOffline() {
        // Reseta as credenciais locais para que o sistema tente relogar no próximo ciclo
        tokenSessao = null;
        
        // CORREÇÃO: Altera instantaneamente o status para vermelho na tela
        $("#val-status").text("Offline").css("color", "#ef4444");
        
        // Zera os indicadores numéricos para indicar a ausência de sinal da API
        $("#val-temp").text("--");
        $("#val-pressao").text("--");
        $("#val-luminosidade").text("--");
        
        // Recolhe todos os medidores visuais e gráficos para zero
        $("#gauge-temp").css("width", "0%");
        $("#gauge-pressao").css("width", "0%");
        $("#comp-bar-lux").css("width", "0%");
        $("#comp-bar-temp").css("width", "0%");
    }

    // ==========================================
    // ATUALIZAÇÃO DO LAYOUT COM DADOS REAIS
    // ==========================================
    function _interfaceAtualizar(temp, pressao, lux) {
        // Alimenta as caixas digitais de texto
        $("#val-temp").text(temp.toFixed(1));
        $("#val-pressao").text(Math.round(pressao));
        $("#val-luminosidade").text(Math.round(lux));

        // Define a largura proporcional dos medidores de nível (Gauges)
        let pctTemp = Math.max(0, Math.min(100, (temp / 50) * 100));
        $("#gauge-temp").css("width", pctTemp + "%");
        
        let pctPressao = ((pressao - 950) / 100) * 100;
        $("#gauge-pressao").css("width", pctPressao + "%");

        // Desenha as barras de comparação simultânea
        let pctLux = (lux / 1000) * 100;
        $("#comp-bar-lux").css("width", pctLux + "%");
        $("#comp-txt-lux").text(Math.round(lux) + " lx");
        
        $("#comp-bar-temp").css("width", pctTemp + "%");
        $("#comp-txt-temp").text(temp.toFixed(1) + "°C");

        // Alimenta o histograma de histórico de temperatura
        gerarHistograma(temp);
    }
    
    window.atualizerInterface = _interfaceAtualizar;

    function gerarHistograma(novaTemp) {
        let agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        historicoTemperatura.push({ hora: agora, valor: novaTemp });
        if (historicoTemperatura.length > MAX_HISTORICO) {
            historicoTemperatura.shift();
        }

        let container = $("#histograma-temp").empty();
        historicoTemperatura.forEach(function (ponto) {
            let altura = Math.max(5, (ponto.valor / 50) * 100);
            container.append(`
                <div class="hist-column">
                    <div class="hist-bar" style="height: ${altura}%">
                        <span>${ponto.valor.toFixed(1)}°</span>
                    </div>
                    <div class="hist-time">${ponto.hora}</div>
                </div>
            `);
        });
    }

    // ==========================================
    // EXECUÇÃO DO LOOP CONTÍNUO DO PAINEL
    // ==========================================
    
    // Executa a primeira checagem de conexão imediatamente
    gerenciarCicloSistema();
    
    // Mantém a verificação e atualização ativa a cada 5 segundos
    setInterval(gerenciarCicloSistema, 5000);

    // ==========================================
    // GESTÃO DOS CARDS DINÂMICOS (MANTIDOS)
    // ==========================================
    $("#btn-admin").click(function () { $("#admin-panel").toggleClass("hidden"); });
    
    $(".btn-toggle").click(function () {
        let target = $(this).data("target");
        $(`#${target}`).toggleClass("hidden");
        $(this).toggleClass("active-btn");
    });

    $(document).on("click", ".btn-close", function () {
        let id = $(this).closest(".widget-card").addClass("hidden").attr("id");
        $(`.btn-toggle[data-target="${id}"]`).removeClass("active-btn");
    });

    $(document).on("click", ".btn-move-up", function () {
        let card = $(this).closest(".widget-card");
        if (card.prev(".widget-card").length > 0) card.insertBefore(card.prev(".widget-card"));
    });

    $(document).on("click", ".btn-move-down", function () {
        let card = $(this).closest(".widget-card");
        if (card.next(".widget-card").length > 0) card.insertAfter(card.next(".widget-card"));
    });
});