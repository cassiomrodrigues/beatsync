# 🎵 BeatSync (iOS & Android)

Aplicativo profissional de metrônomo com biblioteca de músicas e gerenciador de repertórios/playlists (setlists), desenvolvido com **React Native + Expo + TypeScript**.

Compatível com **iOS**, **Android** e **Web Preview**.

---

## 🚀 Como Executar o Aplicativo

### 1. Testar Imediatamente no Computador (Web Preview)
O servidor local já está ativo! Você pode abrir no navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

Para iniciar o servidor de preview manualmente a qualquer momento:
```bash
npm run preview
```

### 2. Rodar no Celular (iPhone ou Android) com o Expo Go
1. Instale o aplicativo gratuito **Expo Go** na [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779) ou na [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent).
2. No terminal do projeto, execute:
   ```bash
   npm start
   ```
3. Um **QR Code** será exibido no terminal:
   - **No Android:** abra o app Expo Go e toque em *Scan QR Code*.
   - **No iPhone:** abra a câmera padrão do iPhone e aponte para o QR Code para abrir no Expo Go.

---

## 📱 Recursos Principais

### ⏱️ 1. Metrônomo Parametrizável de Alta Precisão
- **Controle de Andamento (BPM):** Faixa de 20 a 320 BPM com ajuste fino (+1/-1), ajuste rápido (+5/-5) e marcações de tempo italianas (*Largo, Andante, Moderato, Allegro, Presto*).
- **Tap Tempo Inteligente:** Toque no ritmo da música para calcular o andamento automaticamente com média ponderada de batidas.
- **Fórmulas de Compasso:**
  - Presets comuns: **2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8**.
  - Construtor personalizado: escolha qualquer numerador (1 a 16) e denominador (2, 4, 8, 16).
- **Subdivisões do Tempo:** Semínima (1/4), Colcheia (1/8), Tercina (3T) e Semicolcheia (1/16).
- **Acentuação Dinâmica por Tempo:**
  - Toque em qualquer círculo do compasso para alternar:
    - ▲ **Acentuado / Forte** (destaque de pitch e amplitude)
    - ● **Normal**
    - ◦ **Suave / Ghost note**
    - ✕ **Mudo** (silencia o tempo selecionado)
- **Timbres Sintetizados em Alta Definição:**
  - 🪵 **Madeira (Woodblock):** ressonância acústica orgânica.
  - 🎚️ **Digital (Beep):** senoide pura de 880Hz / 440Hz com decaimento exponencial.
  - 🥁 **Rimshot:** impacto percussivo com ruído filtrado e ataque de caixa.
  - ⚙️ **Mecânico:** clique de escape de pêndulo analógico clássico.
- **Visual & Performance:**
  - Pêndulo analógico oscilante sincronizado com o andamento.
  - Flash visual de tela no primeiro tempo (downbeat), ideal para palcos barulhentos.
  - Cronômetro de ensaio/treino integrado.

---

### 🎸 2. Biblioteca de Músicas
- **Cadastro Completo:**
  - Nome da Música
  - Nome do Artista / Banda
  - Andamento em BPM
  - Fórmula de Compasso
  - Subdivisão recomendada
  - Tom / Tonalidade (*ex: Am, C, G#m*)
  - Duração estimada (*ex: 03:45*)
  - Observações e notas de arranjo (*ex: "Entrada após 4 compassos de bateria"*)
  - Timbre preferido do metrônomo para a música
- **Ação com 1 Toque:** botão **"Tocar no Metrônomo"** ajusta todos os parâmetros instantaneamente e abre o metrônomo pronto para tocar.
- **Busca e Filtros em Tempo Real:** pesquise por título, artista, tom ou compasso e ordene por recentes, ordem alfabética ou BPM.
- **Adicionar à Playlist:** botão direto para vincular a música a qualquer setlist existente.

---

### 📑 3. Gerenciador de Playlists (Setlists)
- Crie múltiplos repertórios (*ex: "Show no Bar de Sexta", "Ensaio Banda de Rock", "Estudo de Técnicas"*).
- Organize a ordem exata de execução das músicas no show através dos botões **▲ Subir** e **▼ Descer**.
- Adicione e remova músicas da biblioteca a qualquer momento.

---

### 🎤 4. Modo Ao Vivo / Show (Live Stage Player)
- Desenvolvido especialmente para o músico no palco (na estante de partitura ou fixador de celular).
- **Tipografia Grande e Alto Contraste:** legível a distância mesmo sob iluminação de palco.
- **Transição Rápida:** botões **PRÓXIMA ›** e **‹ ANTERIOR** mudam o andamento e o compasso do metrônomo no mesmo instante sem interromper o fluxo do show.
- **Visualizador da Próxima Música:** mostra antecipadamente a próxima faixa, andamento e tom para a banda se preparar.
- **Navegador Rápido (Jump Menu):** pule para qualquer música da setlist com 1 toque.

---

### 📦 5. Backup, Restauração e Compartilhamento (JSON)
- Exporte toda a biblioteca de músicas e playlists em formato JSON para salvar no computador ou enviar para outros membros da banda.
- Importe backups salvos para sincronizar aparelhos.
- Restaurador de Repertório com clássicos pré-carregados (*Michael Jackson, Queen, Dave Brubeck, Pink Floyd, Tom Jobim, Metallica, Toto*).

---

## 🛠️ Publicação nas Lojas (Google Play e Apple App Store)

O projeto está pronto para compilar instaladores nativos (.apk/.aab para Android e .ipa para iOS) usando o **EAS (Expo Application Services)**:

1. Instale o EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Inicialize a configuração de build:
   ```bash
   eas build:configure
   ```
3. Gerar build para Android (APK para testes ou AAB para Play Store):
   ```bash
   eas build -p android --profile preview
   ```
4. Gerar build para iOS:
   ```bash
   eas build -p ios
   ```
