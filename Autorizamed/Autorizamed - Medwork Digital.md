# Autorizamed - Medwork Digital

## Objetivo

Digitalizar e automatizar o processo de autorização de exames ocupacionais via formulário inteligente e webhook.

## Telas

### Página Principal / Formulário

**Rota:** `/`

**Objetivo:** Coletar dados da autorização de exames e exibir parceiros/serviços.

**Componentes:**

- **Input CNPJ**: Valida formato e consulta API pública para preencher automaticamente a Razão Social.
- **Input Razão Social (Read-only)**: Preenchimento automático via consulta de CNPJ.
- **Dropdown Tipo ASO**: Exibe opções: Admissional, Periódico, Demissional, Mudança de riscos, Retorno ao trabalho, Pontual.
- **Checkboxes Exames Extras**: Permite seleção múltipla de exames complementares e habilita campo 'Outros' se necessário.
- **Radio Altura/Espaço Confinado**: Seleção binária (SIM / NÃO) para segurança do trabalho.
- **Inputs de Identificação (Email, Funcionário, Data Nasc, Função) Tune**: Coleta informações básicas necessários para a autorização.
- **Botão Enviar Autorização**: Valida obrigatoriedades e envia JSON para o webhook externo. Exibe estado de sucesso/erro.
- **Cards de Divulgação de Serviços**: Redireciona o usuário para o link de serviço configurado.
- **Cards de Patrocinadores (Rodapé)**: Redireciona para o chat do WhatsApp do respectivo patrocinador.

### Confirmação de Envio

**Rota:** `/success`

**Objetivo:** Exibir mensagem de sucesso após o envio dos dados ao webhook.

**Componentes:**

- **Botão Enviar Nova Autorização**: Limpa o formulário e retorna ao estado inicial da página principal.

### Login Admin

**Rota:** `/admin/login`

**Objetivo:** Autenticação de administradores da Medwork.

**Componentes:**

- **Input Login e Senha**: Valida credenciais admin_users e redireciona para o dashboard.
- **Texto Esqueci minha senha**: Inicia fluxo de recuperação de senha por e-mail.

### Dashboard Administrativo

**Rota:** `/admin/dashboard`

**Objetivo:** Gestão de conteúdos dinâmicos, patrocinadores e banners da aplicação.

**Componentes:**

- **Gerenciador de Banners**: Lista, edita e alterna o status (ativo/inativo) dos blocos de serviços.
- **Gerenciador de Patrocinadores**: Upload de logo e edição de links de WhatsApp dos parceiros.
- **Configurações de Chamada de Anúncio**: Atualiza o texto e número de contato da chamada comercial no rodapé.

