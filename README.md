# Studio Criativo AI

Editor visual próprio para criar banners, anúncios, posts e artes, com foco em uso no celular e no computador.

## Tecnologias
- React + TypeScript + Vite
- Fabric.js para edição visual no canvas
- Netlify (frontend)
- Render + Neon/PostgreSQL (backend e projetos na nuvem — próxima etapa)
- NVIDIA AI (recursos generativos — próxima etapa)

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Recursos já iniciados
- Canvas com formatos quadrado, story e banner
- Upload de imagens
- Inserção de texto e formas
- Seleção, movimentação e ajuste de elementos
- Propriedades de cor e posição
- Exportação em PNG
- Salvamento local do projeto no navegador

## Próximas etapas
1. Histórico de desfazer/refazer robusto e biblioteca de modelos.
2. Backend Render e banco Neon para salvar projetos por usuário.
3. Armazenamento de imagens em nuvem.
4. Integração segura com NVIDIA para remoção de fundo, geração e edição de imagens.
5. Autenticação e publicação no Netlify.

**Importante:** chaves de IA devem ficar exclusivamente no backend, nunca no frontend ou no GitHub.