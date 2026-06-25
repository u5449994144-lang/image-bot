const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('imagen')
    .setDescription('Genera una imagen profesional de tu producto para vender')
    .addStringOption(o =>
      o.setName('producto')
        .setDescription('Describe tu producto (ej: zapatillas deportivas rojas)')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('estilo')
        .setDescription('Estilo de la imagen')
        .setRequired(false)
        .addChoices(
          { name: '🛍️ Fondo blanco (tienda online)', value: 'white background, product photography, professional, clean' },
          { name: '📸 Lifestyle (uso real)', value: 'lifestyle photography, natural light, real environment, professional' },
          { name: '✨ Lujo (premium)', value: 'luxury product photography, dark background, dramatic lighting, premium' },
          { name: '🌿 Natural (minimalista)', value: 'minimalist, natural background, soft lighting, elegant' },
        )),
  new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra todos los comandos disponibles'),
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, '1518960571658141778'), { body: commands });
    console.log('✅ Slash commands registrados en el servidor');
  } catch (err) {
    console.error('❌ Error registrando commands:', err);
  }
});

async function generateImage(prompt) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace error: ${error}`);
  }

  const buffer = await response.buffer();
  return buffer;
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'ayuda') {
    const embed = new EmbedBuilder()
      .setTitle('🎨 Bot Generador de Imágenes de Producto')
      .setColor(0x5865F2)
      .setDescription('Genera imágenes profesionales de tus productos para vender más.')
      .addFields(
        { name: '🖼️ `/imagen [producto] [estilo?]`', value: 'Genera una imagen profesional de tu producto. El estilo es opcional.' },
        { name: '❓ `/ayuda`', value: 'Muestra este mensaje.' }
      )
      .setFooter({ text: 'Powered by FLUX AI' });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'imagen') {
    const producto = interaction.options.getString('producto');
    const estilo = interaction.options.getString('estilo') || 'white background, product photography, professional, clean, high quality';

    await interaction.deferReply();

    try {
      const prompt = `${producto}, ${estilo}, ultra realistic, 4k, high quality, commercial photography`;
      console.log(`Generando imagen para: ${prompt}`);

      const imageBuffer = await generateImage(prompt);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'producto.png' });

      const embed = new EmbedBuilder()
        .setTitle(`🎨 Imagen generada: ${producto}`)
        .setColor(0x00ff88)
        .setImage('attachment://producto.png')
        .setFooter({ text: 'Generado con FLUX AI · Listo para usar en tu tienda' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Error generando la imagen. El modelo puede estar cargando, intenta de nuevo en 30 segundos.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
