# 🧠 BeatSync — Project Context & Living Memory

> **Status:** Ativo | **Última Atualização:** Outubro 2026 | **Versão:** 1.0.0

---

## 1. Visão Geral do Produto
O **BeatSync** é um aplicativo mobile profissional focado em músicos, bandas e estudantes de música. Ele combina:
- **Metrônomo de Alta Precisão:** Motor de áudio em tempo real com lookahead scheduling, customização de fórmulas de compasso, subdivisões e acentuações dinâmicas.
- **Biblioteca de Músicas & Repertório:** Gestão completa de faixas com BPM, fórmula de compasso, tom, duração e notas operacionais.
- **Gerenciador de Setlists & Playlists:** Agrupamento e reordenação de repertórios para ensaios e apresentações ao vivo.
- **Modo Palco (Live Setlist):** Interface de alto contraste, controles simplificados para troca rápida de música e sinalização visual (visual downbeat flash).

---

## 2. Stack Tecnológica Atual
| Camada | Tecnologia / Pacote | Versão | Função / Observações |
| :--- | :--- | :--- | :--- |
| **Runtime & Framework** | React Native + Expo | RN 0.88.0 / Expo SDK ~58.0.19 | Ecossistema base multiplataforma (iOS, Android, Web) |
| **Linguagem** | TypeScript | ~6.0.3 | Tipagem estática estrita (`strict: true`) |
| **UI Library** | React | 19.3.0 | Componentes funcionais com Hooks modernos |
| **Engine de Áudio** | Web Audio API / Synthesis | Nativo / Web Audio | Síntese procedural de ondas (senoide, ruído branco, filtros passa-faixa) |
| **Persistência Local** | `@react-native-async-storage/async-storage` | ^3.1.1 | Armazenamento chave-valor offline-first |
| **Feedback Háptico** | `expo-haptics` | ^58.0.7 | Vibração rítmica tátil sincronizada com tempos |
| **Web Runtime** | `react-native-web` + Metro Runtime | ^0.21.4 / ~58.0.15 | Execução de preview web e testes rápidos |

---

## 3. Arquitetura de Pastas e Componentes
```
beatsync/
├── .agents/                 # Orquestração, personas, workflows e skills do projeto
│   └── skills/
│       └── web-pwa-offline-first/ # Skill de arquitetura Local-First e filas de sync
├── assets/                  # Ícones, splash screens e fontes estáticas
├── src/
│   ├── audio/              # Motor de áudio procedural e agendamento de tempos
│   │   └── audioEngine.ts  # Web Audio Context, lookahead loop, geradores de timbre
│   ├── components/         # Componentes visuais atômicos e modais de domínio
│   │   ├── AddToPlaylistModal.tsx
│   │   ├── BeatVisualizer.tsx
│   │   ├── Pendulum.tsx
│   │   ├── PlaylistModal.tsx
│   │   ├── SongModal.tsx
│   │   ├── TapTempo.tsx
│   │   └── TimeSignatureModal.tsx
│   ├── screens/            # Telas principais da aplicação
│   │   ├── LiveSetlistScreen.tsx   # Modo palco / performance
│   │   ├── MetronomeScreen.tsx     # Metrônomo principal interativo
│   │   ├── PlaylistsScreen.tsx     # Gerenciamento de setlists
│   │   ├── SettingsScreen.tsx      # Configurações globais e preferências
│   │   └── SongsScreen.tsx         # Catálogo de músicas
│   ├── storage/            # Camada de abstração e persistência de dados
│   │   └── storage.ts      # CRUD desacoplado sobre AsyncStorage
│   └── types/              # Contratos e tipos de domínio compartilhados
│       └── index.ts        # Interfaces (Song, Playlist, TimeSignature, Timbre, etc.)
├── App.tsx                 # Entrada da aplicação e navegação por abas
├── index.ts                # Registro raiz do Expo
├── package.json            # Dependências e scripts de execução
└── tsconfig.json           # Configuração TypeScript
```

---

## 4. Padrões de Código e Diretrizes Arquiteturais
- **Separação Rígida de Camadas:**
  - O motor de áudio (`src/audio/`) não deve importar estados ou telas de UI diretamente.
  - A persistência (`src/storage/`) é o único ponto de contato com o `AsyncStorage`.
  - Telas e modais consomem contratos definidos em `src/types/`.
- **Precisão Temporal e Performance de Áudio:**
  - O agendamento de cliques (`AudioEngine`) utiliza o relógio de hardware (`AudioContext.currentTime`) com técnica de *lookahead scheduling* em vez de `setInterval` comum para evitar jitter rítmico.
- **Contratos e Tipagem:**
  - Proibido uso de `any`. Toda nova entidade deve ser tipada formalmente em `src/types/`.
- **Estratégia de Branching (Conventional Branches):**
  - Novas features: `feat/<escopo>-<descricao-curta>`
  - Correção de bugs: `fix/<escopo>-<descricao-curta>`
  - Refatorações: `refactor/<escopo>-<descricao-curta>`
  - Documentação/Configuração: `docs/...` ou `chore/...`
- **Segurança & Boas Práticas:**
  - Sanitização de entradas em cadastros de músicas e setlists.
  - Tratamento defensivo de leituras do `AsyncStorage` (fallbacks limpos contra JSON corrompido).

---

## 5. Dívidas Técnicas & Próximas Evoluções Mapeadas
1. **Migração para Expo Router:** O projeto atualmente utiliza navegação manual por abas no `App.tsx`. A evolução recomendada é migrar para navegação declarativa baseada em pastas (`src/app/`).
2. **Camada de Testes Automatizados:** Configuração do Jest + React Native Testing Library para cobrir cálculos matemáticos de BPM, parsing de compassos e testes de unidade do `storage.ts`.
3. **Persistência Relacional / Nuvem (Futuro):** Possibilidade de sincronização em nuvem (ex: Supabase / Firebase) para compartilhamento de setlists entre membros de banda.
