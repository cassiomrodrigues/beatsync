# 🎵 BeatSync — Metrônomo Profissional PWA & Mobile

Aplicativo profissional de metrônomo progressivo em formato **PWA (Progressive Web App)** e Mobile, desenvolvido especificamente para músicos e uso em tempo real (palco, ensaios e igrejas).

Construído com **React Native + Expo Web + TypeScript + Web Audio API**, persistência relacional com **Supabase** e hospedagem global ultrarrápida no **Cloudflare Pages**.

---

## 🌐 Acesso Online & Deploy

- **URL de Produção Cloudflare Pages:** 👉 **[https://beatsync-75q.pages.dev](https://beatsync-75q.pages.dev)**
- **Backend & Auth:** Supabase PostgreSQL com Row Level Security (RLS)
- **Modo PWA:** Instalável diretamente no iPhone (Safari -> Adicionar à Tela de Início) e Android (Chrome -> Instalar Aplicativo).

---

## 🚀 Como Executar Localmente

### 1. Testar no Navegador (Web Preview)
```bash
npm run preview
```
Acesse: 👉 **[http://localhost:3000](http://localhost:3000)**

### 2. Rodar no Celular via Expo Go
```bash
npm start
```
Escaneie o QR Code gerado no terminal usando o app **Expo Go** (Android) ou a Câmera (iOS).

### 3. Gerar Build de Produção para Web/PWA
```bash
npm run build:web
```

---

## 🎨 Filosofia de Design & Temas Selecionáveis

Desenvolvido para máxima discrição e legibilidade em ambientes com iluminação desafiadora:

1. **OLED Zero Luz (Fundo #000000 Absoluto):**
   - Economia extrema de bateria em telas AMOLED/OLED.
   - Total discrição visual no altar ou palco escuro — zero reflexo ou brilho indesejado para o público.
2. **OLED Âmbar (Igreja & Altar):**
   - Preto absoluto combinado com tons âmbar quentes, proporcionando descanso visual total e serenidade em cultos noturnos.
3. **Dark Studio:**
   - Azul ardósia profundo com acentos ciano elétrico — layout clássico e moderno de estúdio.
4. **Stage High-Vis (Amarelo Elétrico):**
   - Preto puro com elementos em amarelo neon de alto contraste para visibilidade máxima sob refletores ou a longa distância.

---

## 🔊 Motor de Áudio Web Audio API & Wake Lock

- **Síntese Procedural sem Latência:** Os cliques do metrônomo são sintetizados matematicamente em tempo real via Web Audio API (*senoides, ruído filtrado e envoltórias de ganho exponencial*). Zero arquivos de áudio pesados, com lookahead scheduling de alta precisão imune a flutuações de timer.
- **Tela Sempre Ativa (Screen Wake Lock):** Enquanto o metrônomo ou o player estiver em execução, o BeatSync aciona a **Screen Wake Lock API** (e `expo-keep-awake`), impedindo que o celular ou tablet bloqueie a tela durante a música.

---

## 🔐 Controle de Acesso & Supabase Cloud

- **Autenticação:** Cadastro e login seguros com e-mail e senha gerenciados pelo Supabase Auth.
- **Biblioteca Particular:** Músicas do usuário mantidas com proteção rigorosa através de Row Level Security (RLS).
- **Biblioteca Global:** Opção de publicar músicas com 1 clique para a comunidade BeatSync. Outros músicos podem pesquisar e importar faixas diretamente para seus repertórios.
- **Compartilhamento Direto:** Compartilhe qualquer música da sua biblioteca informando o e-mail de outro músico (com opção de liberar ou restringir permissão de edição).

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

- `profiles`: Perfis de músicos vinculados a `auth.users`.
- `songs`: Catálogo de faixas com BPM, fórmula de compasso, tonalidade, subdivisão, timbres, notas e flag `is_public`.
- `song_shares`: Controle de compartilhamento por e-mail com permissão de edição (`can_edit`).
- `playlists` & `playlist_songs`: Gestão relacional de setlists e repertórios de apresentações.
- **Políticas RLS:** Cada usuário acessa somente suas faixas, músicas explicitamente compartilhadas com ele ou faixas públicas da comunidade.

---

## 🚀 Integração Cloudflare Pages & CI/CD

O projeto conta com fluxo automatizado via **GitHub Actions** (`.github/workflows/deploy-cloudflare.yml`):
- Todo push para o branch `main` executa a exportação estática do Expo Web (`npm run build:web`).
- O artefato gerado na pasta `dist/` é publicado automaticamente no projeto **Cloudflare Pages** `beatsync`.
