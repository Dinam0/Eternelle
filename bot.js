const fs = require('fs');
const { Client, EmbedBuilder, Events, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const mongoose = require('mongoose');
const User = require('./data/user-schema');
const EmbedModel = require('./data/embedmodel-schema')
// Connexion à MongoDB
mongoose.connect('mongodb+srv://Dinamo:Hajimeru210@cluster0.c47ln.mongodb.net/Dinavid', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(error => console.error('Failed to connect to MongoDB:', error));

// Création du Client
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// Stockage de toutes les commandes
client.commands = new Collection();

const commandFolders = fs.readdirSync('./commands');

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    client.commands.set(command.data.name, command);
  }
}

// Message quand le bot est en ligne
client.once('ready', () => {
  console.log('Bot is ready!');
  
  client.guilds.cache.forEach(guild => {
    guild.commands.set(client.commands.map(command => command.data));
  });
});

// Créez un Map pour stocker les collecteurs d'interaction en cours
const interactionCollectors = new Map();

// Verification quand une commande est lancée
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = interaction.commandName;

  if (!client.commands.has(command)) return;

  try {
    const cmd = client.commands.get(command);

      // Vérification de l'owner du bot pour les autres commandes
      if (interaction.user.id !== '264747361513766912') {
        await interaction.reply({ content: 'Vous n\'êtes pas autorisé à exécuter cette commande.', ephemeral: true });
        return;
      }

      await cmd.execute(interaction);
    
  } catch (error) {
    console.error(error);
    console.log('Une erreur s\'est produite lors de l\'exécution de la commande : ' + error);

    // Handle the specific error code for "Unknown interaction"
    if (error.code === 10062) {
      await interaction.reply({ content: 'Une erreur s\'est produite lors du traitement de l\'interaction.', ephemeral: true });
    }
  }
});

// Gestion des interactions de boutons
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Vérifier si l'interaction provient du profil
  if (interaction.message.embeds[0]?.title === 'PROFIL') {
    // Exécuter la logique pour les interactions de profil ici
    // Assurez-vous d'importer et de gérer correctement les profils de la base de données
  }
});

// _____            __ _ _     
// |  __ \          / _(_) |    
// | |__) | __ ___ | |_ _| |___ 
// |  ___/ '__/ _ \|  _| | / __|
// | |   | | | (_) | | | | \__ \
// |_|   |_|  \___/|_| |_|_|___/

// Interaction quand le bouton "créer un profil" est appuyé
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  //////////////////////
  //                  //
  //     REGISTER     //
  //                  //
  //////////////////////

  if (interaction.customId === 'register') {
    const name = interaction.fields.getTextInputValue('nameInput');
    const age = interaction.fields.getTextInputValue('ageInput');
    const gender = interaction.fields.getTextInputValue('genreInput');
    const bio = interaction.fields.getTextInputValue('bioInput');
    const discordUsername = interaction.user.username;
    const image = interaction.user.displayAvatarURL();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const mp = interaction.fields.getTextInputValue('mpInput');

    const mpCapitalized = mp.charAt(0).toUpperCase() + mp.slice(1);
    const genderCapitalized = gender.charAt(0).toUpperCase() + gender.slice(1);

    // Check if the specified gender is valid
    const validGenders = ['Femme', 'Homme', 'Autre'];
    if (!validGenders.includes(genderCapitalized)) {
      await interaction.reply({
        content:
          'Le genre spécifié n\'est pas **valide**. Veuillez choisir parmi **Femme**, **Homme** ou **Autre**.',
        ephemeral: true,
      });
      return;
    }

    // Check if the specified MP value is valid
    const validMp = ['Ouvert', 'Fermé'];
    if (!validMp.includes(mpCapitalized)) {
      await interaction.reply({
        content: 'Veuillez indiquer si vos **MP** sont **Ouvert** ou **Fermé**.',
        ephemeral: true,
      });
      return;
    }

    // Check if the user has the allowed age
    if (age < 16) {
      await interaction.reply({
        content:
          'Vous n\'avez pas l\'âge **autorisé** dans ce serveur. **Lisez le règlement** pour plus d\'informations.',
        ephemeral: true,
      });
      return;
    }

    const genre = genderCapitalized;
  
    // Create a new document with all user data
    const user = new User({
      name,
      age,
      genre,
      bio,
      discordUsername,
      image,
      guildId,
      userId,
      mp,
    });

    try {
      // Save to the database
      await user.save();
      console.log('Profil créé pour:', user);

      // Assign roles based on gender and age
      const member = await interaction.guild.members.fetch(userId);
      const genderRole = interaction.guild.roles.cache.find((role) => role.name === genderCapitalized);
      const ageRole =
        age >= 18 && age <= 25
          ? interaction.guild.roles.cache.find((role) => role.name === '18-25')
          : age >= 16 && age < 18
          ? interaction.guild.roles.cache.find((role) => role.name === '16-18')
          : interaction.guild.roles.cache.find((role) => role.name === '25+');
      const mpRole = mp === 'Ouvert' ? interaction.guild.roles.cache.find((role) => role.name === 'MP Ouvert') : mp === 'Fermé' ? interaction.guild.roles.cache.find((role) => role.name === 'MP Fermé') : null;
  
      if (genderRole) {
        await member.roles.add(genderRole);
      }
      if (ageRole) {
        await member.roles.add(ageRole);
      }
      if (mpRole) {
        await member.roles.add(mpRole);
      }
  

      // Create an embed to display the user profile
      const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: name, iconURL: image })
        .addFields(
          { name: 'Âge', value: age },
          { name: 'Genre', value: gender, inline: false },
          { name: 'Message privé (MP)', value: mpCapitalized, inline: false },
          { name: 'Biographie', value: bio, inline: false }
        )
        .setImage(image)
        .setFooter({ text: `${userId} (${discordUsername})` });

      // Get the role names and add them to the profile message
      const addedRoles = [];
      if (genderRole) {
        await member.roles.add(genderRole);
        addedRoles.push(genderRole.name);
      }
      if (ageRole) {
        await member.roles.add(ageRole);
        addedRoles.push(ageRole.name);
      }
      if (mpRole) {
        await member.roles.add(mpRole);
        addedRoles.push(mpRole.name);
      }
      // Add the "membre" role
      const membreRole = interaction.guild.roles.cache.find((role) => role.name === 'Membre');
      if (membreRole) {
        await member.roles.add(membreRole);
        addedRoles.push(membreRole.name);
      }
  
      await interaction.reply({
        content: `Voici ton profil ! Tu as obtenu les rôles suivants : ${addedRoles.join(', ')}. Tu peux toujours le modifier à l'aide du bouton **Modifier le profil**.`,
        embeds: [exampleEmbed],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Failed to save user to MongoDB:', error);
      await interaction.reply({
        content: 'Une erreur s\'est produite lors de la sauvegarde des données de l\'utilisateur.',
        ephemeral: true,
      });
    }
  }

  /////////////////////
  //                 //
  //     MODIFY      //
  //                 //
  /////////////////////

  if (interaction.customId === 'modify') {
    const name = interaction.fields.getTextInputValue('nameInput');
    const age = interaction.fields.getTextInputValue('ageInput');
    const gender = interaction.fields.getTextInputValue('genreInput');
    const bio = interaction.fields.getTextInputValue('bioInput');
    const discordUsername = interaction.user.username;
    const image = interaction.user.displayAvatarURL();
    const mp = interaction.fields.getTextInputValue('mpInput');
    const genderCapitalized = gender.charAt(0).toUpperCase() + gender.slice(1);
    const mpCapitalized = mp.charAt(0).toUpperCase() + mp.slice(1);
    const user = await User.findOne({ discordUsername });
  
    // Check if the specified gender is valid
    const validGenres = ['Femme', 'Homme', 'Autre'];
    if (!validGenres.includes(genderCapitalized)) {
      await interaction.reply({
        content:
          'Le genre spécifié n\'est pas **valide**. Veuillez choisir parmi **Femme**, **Homme** ou **Autre**.',
        ephemeral: true,
      });
      return;
    }
  
    // Check if the specified MP value is valid
    const validMp = ['Ouvert', 'Fermé'];
    if (!validMp.includes(mpCapitalized)) {
      await interaction.reply({
        content: 'Veuillez indiquer si vos **MP** sont **Ouvert** ou **Fermé**.',
        ephemeral: true,
      });
      return;
    }
  
    // Check if the user has the allowed age
    if (age < 16) {
      await interaction.reply({
        content:
          'Vous n\'avez pas l\'âge **autorisé** dans ce serveur. **Lisez le règlement** pour plus d\'informations.',
        ephemeral: true,
      });
      return;
    }

    const genre = genderCapitalized;
  
    if (user) {
      // Modification des informations de l'utilisateur
      user.name = name;
      user.age = age;
      user.bio = bio;
      user.genre = genre;
      user.discordUsername = discordUsername;
      user.image = image;
      user.mp = mpCapitalized;
  
      // Save to the database
      await user.save();
  
      // Assign roles based on gender and age
      const member = await interaction.guild.members.fetch(user.userId);

      const ageRolesToRemove = ['16-18', '18-25', '25+'];
      const currentAgeRole = member.roles.cache.find((role) => ageRolesToRemove.includes(role.name));
      if (currentAgeRole) {
        await member.roles.remove(currentAgeRole);
      }
  
      // Remove genre-related roles
      const genreRolesToRemove = ['Femme', 'Homme', 'Autre'];
      const currentGenreRole = member.roles.cache.find((role) => genreRolesToRemove.includes(role.name));
      if (currentGenreRole) {
        await member.roles.remove(currentGenreRole);
      }
  
      // Remove mp-related roles
      const mpRolesToRemove = ['MP Ouvert', 'MP Fermé'];
      const currentMpRole = member.roles.cache.find((role) => mpRolesToRemove.includes(role.name));
      if (currentMpRole) {
        await member.roles.remove(currentMpRole);
      }
      
      const currentRoles = member.roles.cache.map(role => role.name);
      const genderRole = interaction.guild.roles.cache.find((role) => role.name === genderCapitalized);
      const ageRole =
        age >= 18 && age <= 25
          ? interaction.guild.roles.cache.find((role) => role.name === '18-25')
          : age >= 16 && age < 18
          ? interaction.guild.roles.cache.find((role) => role.name === '16-18')
          : interaction.guild.roles.cache.find((role) => role.name === '25+');
      const mpRole = mp === 'Ouvert' ? interaction.guild.roles.cache.find((role) => role.name === 'MP Ouvert') : mp === 'Fermé' ? interaction.guild.roles.cache.find((role) => role.name === 'MP Fermé') : null;
  
      const modifiedRoles = [];
      if (genderRole) {
        await member.roles.add(genderRole);
        modifiedRoles.push(genderRole.name);
      }
      if (ageRole) {
        await member.roles.add(ageRole);
        modifiedRoles.push(ageRole.name);
      }
      if (mpRole) {
        await member.roles.add(mpRole);
        modifiedRoles.push(mpRole.name);
      }

      const addedRoles = [];
      const removedRoles = [];
  
      // Check for added roles
      if (genderRole && !currentRoles.includes(genderRole.name)) {
        await member.roles.add(genderRole);
        addedRoles.push(genderRole.name);
      }
      if (ageRole && !currentRoles.includes(ageRole.name)) {
        await member.roles.add(ageRole);
        addedRoles.push(ageRole.name);
      }
      if (mpRole && !currentRoles.includes(mpRole.name)) {
        await member.roles.add(mpRole);
        addedRoles.push(mpRole.name);
      }
  
      // Check for removed roles
      for (const role of currentRoles) {
        if (role === genderRole?.name && (!genderRole || genderRole.name !== genderCapitalized)) {
          await member.roles.remove(interaction.guild.roles.cache.find(r => r.name === role));
          removedRoles.push(role);
        }
        if (role === ageRole?.name && (!ageRole || (age < 18 && ageRole.name === '18-25') || (age >= 18 && ageRole.name === '16-18') || (age >= 25 && ageRole.name !== '25+'))) {
          await member.roles.remove(interaction.guild.roles.cache.find(r => r.name === role));
          removedRoles.push(role);
        }
        if (role === mpRole?.name && (!mpRole || mpRole.name !== mpCapitalized)) {
          await member.roles.remove(interaction.guild.roles.cache.find(r => r.name === role));
          removedRoles.push(role);
        }
      }
  
      // Create an embed to display the modified user profile
      const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: name, iconURL: image })
        .addFields(
          { name: 'Âge', value: age },
          { name: 'Genre', value: gender, inline: false },
          { name: 'Message privé (MP)', value: mpCapitalized, inline: false },
          { name: 'Biographie', value: bio, inline: false }
        )
        .setImage(image)
        .setFooter({ text: `${user.userId} (${discordUsername})` });

        if (addedRoles.length > 0 || removedRoles.length > 0) {
          let reply = '';
          if (addedRoles.length > 0) {
            reply += `Les rôles suivants ont été ajoutés : ${addedRoles.join(', ')}. `;
          }
          if (removedRoles.length > 0) {
            reply += `Les rôles suivants ont été supprimés : ${removedRoles.join(', ')}. `;
          }
          reply += 'Voici le profil mis à jour :';
        
          try {
            await interaction.reply({
              content: reply,
              embeds: [exampleEmbed],
              ephemeral: true,
            });
          } catch (error) {
            console.error(error);
            console.log('Une erreur s\'est produite lors de la réponse à l\'interaction : ' + error);
        
            // Handle the specific error code for "Unknown interaction"
            if (error.code === 10062) {
              await interaction.reply({ content: 'Une erreur s\'est produite lors du traitement de l\'interaction.', ephemeral: true });
            }
          }
        } else {
        try {
          await interaction.reply({
            content: 'Les informations de votre profil ont été mises à jour ! Voici le profil mis à jour :',
            embeds: [exampleEmbed],
            ephemeral: true,
          });
        } catch (error) {
          console.error(error);
          console.log('Une erreur s\'est produite lors de la réponse à l\'interaction : ' + error);
      
          // Handle the specific error code for "Unknown interaction"
          if (error.code === 10062) {
            await interaction.reply({ content: 'Une erreur s\'est produite lors du traitement de l\'interaction.', ephemeral: true });
          }
        }
      }
    } else {
      try {
        await interaction.reply({
          content: 'Vous n\'avez pas encore de profil. Utilisez le bouton "Créer un profil" pour en créer un.',
          ephemeral: true,
        });
      } catch (error) {
        console.error(error);
        console.log('Une erreur s\'est produite lors de la réponse à l\'interaction : ' + error);
    
        // Handle the specific error code for "Unknown interaction"
        if (error.code === 10062) {
          await interaction.reply({ content: 'Une erreur s\'est produite lors du traitement de l\'interaction.', ephemeral: true });
        }
      }
    }
  }
});



// Bot login
client.login(config.token);
