const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType, EmbedBuilder, ButtonStyle, ButtonBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const User = require('../../data/user-schema');
const config = require('../../config');
const serverId = config.serverId;
const botToken = config.token;

const interactionCollectors = new Map();

module.exports = {
  data: {
    name: 'search',
    description: 'Affiche les profils avec pagination et filtrage',
  },
  async execute(interaction) {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'search') {
      const pageSize = 1; // Un profil par page

      // Récupérer les données du menu de recherche
      const searchOptions = [
        { label: 'Homme', value: 'Homme' },
        { label: 'Femme', value: 'Femme' },
        { label: 'Autre', value: 'Autre' },
        { label: '16 - 18', value: '16-18' },
        { label: '18 - 25', value: '18-25' },
        { label: '25+', value: '25+' },
      ];

      const searchMenu = new StringSelectMenuBuilder()
        .setCustomId('searchMenu')
        .setPlaceholder('Sélectionnez les critères de recherche')
        .setMinValues(0) // Aucune sélection minimale requise
        .setMaxValues(searchOptions.length); // Sélection jusqu'au nombre total d'options

      searchMenu.addOptions(searchOptions);

      const row = new ActionRowBuilder().addComponents(searchMenu);

      try {
        // Afficher le menu de recherche
        await interaction.reply({
          content: 'Veuillez choisir les critères de recherche.',
          components: [row],
          ephemeral: true,
        });
      } catch (error) {
        console.error('Une erreur s\'est produite lors de l\'affichage du menu de recherche :', error);
        await interaction.followUp({
          content: 'Une erreur s\'est produite lors de l\'affichage du menu de recherche.',
          ephemeral: true,
        });
      }

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 3_600_000,
      });

      interactionCollectors.set('searchMenu', collector);

      collector.on('collect', async (selectInteraction) => {
        try {
          if (selectInteraction.deferred || selectInteraction.replied) {
            return;
          }
        
          if (selectInteraction.customId === 'searchMenu') {
            const selectedOptions = selectInteraction.values;
            const filters = {};

            selectedOptions.forEach((option) => {
              if (option === 'Homme' || option === 'Femme' || option === 'Autre') {
                if (!filters.genre) {
                  filters.genre = [];
                }
                filters.genre.push(option);
              } else if (option === '16-18') {
                filters.age = { $gte: 16, $lte: 18 };
              } else if (option === '18-25') {
                filters.age = { $gte: 18, $lte: 25 };
              } else if (option === '25+') {
                filters.age = { $gte: 25 };
              }
            });

            // Vérifications pour ajuster les filtres en fonction des options sélectionnées
            if (selectedOptions.includes('16-18') && selectedOptions.includes('18-25')) {
              filters.age = { $gte: 16, $lte: 25 };
            } else if (selectedOptions.includes('16-18') && selectedOptions.includes('25+')) {
              filters.age = { $gte: 16 };
            } else if (selectedOptions.includes('18-25') && selectedOptions.includes('25+')) {
              filters.age = { $gte: 18 };
            }

            const profiles = await User.find(filters);
            const filteredProfiles = [];
            for (const profile of profiles) {
              if (profile.mp !== 'Fermé') {
                try {
                  const member = await interaction.guild.members.fetch(profile.userId);
                  if (member) {
                    filteredProfiles.push(profile);
                  } else {
                    // Tenter de supprimer le profil de l'utilisateur qui n'est plus présent sur le serveur
                    try {
                      await User.deleteOne({ userId: profile.userId });
                      console.log(`Profil supprimé pour l'utilisateur ${profile.userId}`);
                    } catch (error) {
                      console.error(`Erreur lors de la suppression du profil pour l'utilisateur ${profile.userId}`, error);
                    }
                  }
                } catch (error) {
                  if (error.code === 10013) {
                    // Unknown User, tenter de supprimer le profil de l'utilisateur
                    try {
                      await User.deleteOne({ userId: profile.userId });
                      console.log(`Profil supprimé pour l'utilisateur ${profile.userId}`);
                    } catch (error) {
                      console.error(`Erreur lors de la suppression du profil pour l'utilisateur ${profile.userId}`, error);
                    }
                  } else {
                    console.error(error);
                  }
                }
              }
            }
            const totalPages = Math.ceil(filteredProfiles.length / pageSize);
            console.log(totalPages);
            let currentPage = 1;

            if (filteredProfiles.length === 0) {
              try {
                await selectInteraction.deferReply({ ephemeral: true });
              } catch (error) {
                console.error('An error occurred while deferring the reply:', error);
              }            
              await selectInteraction.followUp({
                content: 'Aucun résultat pour la sélection. Veuillez créer un profil dans <#1127181162666807296>.',
                ephemeral: true,
              });
            } else {
              const sendProfileEmbed = async (pageNumber) => {
                const profile = filteredProfiles[pageNumber - 1];
                const exampleEmbed = new EmbedBuilder()
                  .setColor(0x0099FF)
                  .setAuthor({ name: profile.name, iconURL: profile.image })
                  .addFields(
                    { name: 'Âge', value: `${profile.age}` },
                    { name: 'Genre', value: `${profile.genre}`, inline: false },
                    { name: 'Message privé', value: `${profile.mp}` },
                    { name: 'Biographie', value: `${profile.bio}`, inline: false },
                  )
                  .setImage(profile.image)
                  .setFooter({ text: `iD ${profile.userId} (${profile.discordUsername}) - Page: ${currentPage}/${totalPages}` });

                const likeButton = new ButtonBuilder()
                  .setCustomId(`likeButton_${profile.userId}`)
                  .setLabel('❤️')
                  .setStyle(ButtonStyle.Success);

                const previousButton = new ButtonBuilder()
                  .setCustomId('previousButton')
                  .setLabel('⬅️')
                  .setStyle(ButtonStyle.Primary);

                const nextButton = new ButtonBuilder()
                  .setCustomId('nextButton')
                  .setLabel('➡️')
                  .setStyle(ButtonStyle.Primary);

                const actionRow = new ActionRowBuilder()
                  .addComponents(previousButton, likeButton, nextButton);

                  try {
                    await selectInteraction.editReply({ embeds: [exampleEmbed], components: [actionRow], ephemeral: true });
                  } catch (error) {
                    console.error('Une erreur s\'est produite lors de la modification de la réponse :', error);
                  }
              };

              let paginationSent = false; 

              const sendPaginationButtons = async () => {
                if (paginationSent) {
                  return;
                }
                const previousButton = new ButtonBuilder()
                  .setCustomId('previousButton')
                  .setLabel('⬅️ Page précédente')
                  .setStyle(ButtonStyle.Primary);

                const nextButton = new ButtonBuilder()
                  .setCustomId('nextButton')
                  .setLabel('➡️ Page suivante')
                  .setStyle(ButtonStyle.Primary);

                const actionRow = new ActionRowBuilder().addComponents(previousButton, nextButton);

                try {
                  await selectInteraction.reply({ content: 'Voici les profils correspondant à votre sélection.', components: [actionRow], ephemeral: true });
                } catch (error) {
                  if (error.code === 'InteractionAlreadyReplied') {
                    // L'interaction a déjà été répondu ou différée, vous pouvez ignorer cette erreur
                    console.log('L\'interaction a déjà été répondu ou différée.');
                  } else {
                    // Gérer d'autres erreurs
                    console.error('Une erreur s\'est produite lors de la réponse à l\'interaction :', error);
                  }
                }

                paginationSent = true; // Mettre à jour l'état de la réponse
              };

              await sendPaginationButtons();
              await sendProfileEmbed(currentPage);

              const buttonCollector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 3_600_000,
              });
              
              buttonCollector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.deferred || buttonInteraction.replied) {
                  return;
                }
                if (buttonInteraction.customId === 'previousButton') {
                  if (currentPage > 1) {
                    currentPage--;
                    await sendProfileEmbed(currentPage);
                  }
                } else if (buttonInteraction.customId === 'nextButton') {
                  if (currentPage < totalPages) {
                    currentPage++;
                    await sendProfileEmbed(currentPage);
                  }
                } else if (buttonInteraction.customId.startsWith('likeButton_')) {
                  if (buttonInteraction.deferred && buttonInteraction.replied) {
                    await buttonInteraction.deferUpdate().catch(console.error);
                  }
                  try {
                    const likedUserId = buttonInteraction.customId.split('_')[1];
                        
                    const likedUser = await User.findOne({ userId: buttonInteraction.user.id });

                    const liked = await User.findOne({ userId: likedUserId });

                    if (likedUser) {

                    // Vérification pour éviter l'auto-like
                    if (likedUserId === buttonInteraction.user.id) {
                      await buttonInteraction.deferUpdate();
                      await buttonInteraction.followUp({ content: 'Tu ne peux pas **aimer** toi-même.', ephemeral: true });
                      return;
                    }
    
                    const likeChannelName1 = `like${likedUserId}${buttonInteraction.user.id}`;
                    const likeChannelName2 = `like${buttonInteraction.user.id}${likedUserId}`;
    
                    // Vérification si le salon de like existe déjà
                    const existingChannels1 = interaction.guild.channels.cache.filter(channel => channel.name === likeChannelName1);
                    const existingChannels2 = interaction.guild.channels.cache.filter(channel => channel.name === likeChannelName2);

                    if (existingChannels1.size > 0 || existingChannels2.size > 0) {
                      await buttonInteraction.deferUpdate();
                      await buttonInteraction.followUp({ content: 'Tu ne peux plus **aimer** ce profil. \nCar: Cet utilisateur n\'est pas interessé par ton profil, Vous vous êtes déjà ajoutés.', ephemeral: true });
                      return;
                    }    
      
    
                    const closedlikeChannelName1 = `closed-like${buttonInteraction.user.id}${likedUserId}`;
                    const closedlikeChannelName2 = `closed-like${likedUserId}${buttonInteraction.user.id}`;
    
                    // Vérification si le salon de like existe déjà
                    const existingsChannels1 = interaction.guild.channels.cache.filter(channel => channel.name === closedlikeChannelName1);
                    const existingsChannels2 = interaction.guild.channels.cache.filter(channel => channel.name === closedlikeChannelName2);

                    if (existingsChannels1.size > 0  || existingsChannels2 .size > 0) {
                      await buttonInteraction.deferUpdate();
                        await buttonInteraction.followUp({ content: 'Tu ne peux plus **aimer** ce profil. \nCar: Cet utilisateur n\'est pas interessé par ton profil ou vous vous êtes déjà ajoutés.', ephemeral: true  });            
                      return;
                    }  
                      const likeChannelName = `like${likedUserId}${buttonInteraction.user.id}`;
                      await buttonInteraction.reply({content : `Vous avez **aimé** le profil de : **${liked.name}**. En attente de sa réponse...`, ephemeral: true});
                
                      try {

                        const liker = await User.findOne({ userId: likedUser.userId});
                        const liked = await User.findOne({ userId: likedUserId });
    
                        const likeChannel = await buttonInteraction.guild.channels.create({
                          name: likeChannelName, 
                          type: ChannelType.GuildText,
                          permissionOverwrites: [
                            {
                              id: buttonInteraction.guild.roles.everyone.id,
                              deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                              id: liked.userId,
                              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                            },
                            {
                              id: likedUser.userId,
                              deny: [PermissionFlagsBits.ViewChannel],
                            },
                          ],
                        });
    
    
                        const viewEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setAuthor({
                          name: liker.name,
                          iconURL: liker.image
                        })
                        .addFields(
                          { name: 'Âge', value: liker.age.toString() },
                          { name: 'Genre', value: liker.genre.toString(), inline: false },
                          { name: 'Message privé (MP)', value: liker.mp.toString(), inline: false },            
                          { name: 'Biographie', value: liker.bio.toString(), inline: false },
                        )
                        .setImage(liker.image)
                        .setFooter({ text: `${liker.userId} (${liker.discordUsername})` });

                        const confirmMessage = await likeChannel.send({content: `<@${liked.userId}>, souhaitez-vous faire connaissance avec cette personne ?`, embeds: [viewEmbed],
                        components: [
                          new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                              .setCustomId('likeButton')
                              .setLabel('👍')
                              .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                              .setCustomId('dislikeButton')
                              .setLabel('👎')
                              .setStyle(ButtonStyle.Danger)
                          )
                        ]
                      });
                        
                
                      const filter = i => i.customId === 'likeButton' || i.customId === 'dislikeButton';
                      const collector = confirmMessage.createMessageComponentCollector({ filter, time: 3_600_000 });
                      
                      collector.on('collect', async buttonInteraction => {
                      try {
                        if (buttonInteraction.deferred || buttonInteraction.replied) {
                          return;
                        }
                        try {
                          if (buttonInteraction.customId === 'likeButton') {
            
                            const closeButton = new ButtonBuilder()
                            .setCustomId('closeButton')
                            .setLabel('❌ Fermer la conversation')
                            .setStyle(ButtonStyle.Danger);
                          
                          const actionRow = new ActionRowBuilder()
                            .addComponents(closeButton);
                          
                          await confirmMessage.edit({ content: '', embeds: [viewEmbed], components: [actionRow]});

                          const filter = i => i.customId === 'closeButton';
                          const closecollector = confirmMessage.createMessageComponentCollector({ filter, time: 3_600_000 });

                          closecollector.on('collect', async (buttonInteraction) => {

                            if (buttonInteraction.deferred || buttonInteraction.replied) {
                              return;
                            }
                            try {
                              if (buttonInteraction.customId === 'closeButton') {
                                if (!buttonInteraction.deferred && !buttonInteraction.replied) {
                                  await buttonInteraction.deferUpdate();
                                  }  
                        
                                // Supprimer le salon de like
                                closecollector.stop()
                                collector.stop()
                                await likeChannel.setName(`closed-${likeChannelName}`);
                                await confirmMessage.edit({content: `Salon fermé. Raison: **${buttonInteraction.user.username} a mit fin à la conversation**\nDemandez à un administrateur de vous remettre les droits au salon si vous voulez continuer de parler.`,                       components: [
                                  new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                    .setCustomId('closeButton')
                                    .setLabel('❌ Fermer la conversation')
                                    .setStyle(ButtonStyle.Secondary)
                                  )
                                ]})
                                await likeChannel.permissionOverwrites.edit(liked.userId, {
                                  ViewChannel: true,
                                  SendMessages: false,
                                });
                                await likeChannel.permissionOverwrites.edit(liker.userId, {
                                  ViewChannel: true,
                                  SendMessages: false,
                                });
                        
                                // Mettre fin à la collector du bouton
                                closecollector.stop();
                        
                                // Envoyer un message de confirmation à l'utilisateur
                              }
                        
                              // Gérer les autres boutons (previousButton, nextButton, etc.)
                            } catch (error) {
                              console.error('Erreur lors de la gestion des boutons :', error);
                            }
                          });
    
                            if (liker) {

                            } else {
                              await buttonInteraction.followUp({ content: 'Erreur : Utilisateur non trouvé.' });
                            }
                            await likeChannel.permissionOverwrites.edit(liker.userId, {
                              ViewChannel: true,
                              SendMessages: true,
                            }); 
                            await likeChannel.send(`<@${liker.userId}> Vous avez obtenu un match avec **${liked.name}** !`);
                            await buttonInteraction.reply({ content: 'Vous avez **aimé** cette personne en retour.', ephemeral: true });
                          } else if (buttonInteraction.customId === 'dislikeButton') {

                            await likeChannel.send(`<@${liker.userId}> ${liked.name} n'est pas intéressée.`);
                            await likeChannel.setName(`closed-${likeChannelName}`);
                            await likeChannel.permissionOverwrites.edit(liked.userId, {
                              ViewChannel: true,
                              SendMessages: false,
                            });
                            await likeChannel.permissionOverwrites.edit(liker.userId, {
                              ViewChannel: true,
                              SendMessages: false,
                            });
                            collector.stop()
                            await confirmMessage.edit({content: 'Salon fermé. Raison: **Refus**', components: [
                              new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                  .setCustomId('likeButton')
                                  .setLabel('👍')
                                  .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                  .setCustomId('dislikeButton')
                                  .setLabel('👎')
                                  .setStyle(ButtonStyle.Secondary)
                              )
                            ]
                          });
                            await buttonInteraction.reply({ content: 'Vous avez refusé de rencontrer : ' + liker.userId, ephemeral: true });
                          }
                        } catch (error) {
                          console.error('Erreur lors de la gestion des boutons :', error);
                        }
                      } catch (error) {
                        if (error.code === 10062) {
                          console.error('Erreur : Interaction inconnue');
                          // Gérer l'erreur ici, par exemple en envoyant une réponse appropriée à l'utilisateur
                        } else {
                          console.error('Une erreur s\'est produite lors de la collecte de l\'interaction :', error);
                        }
                      }
                      });
                      
                      if (!buttonInteraction.deferred && !buttonInteraction.replied) {
                        await buttonInteraction.deferUpdate();
                        }   
    
                      } catch (error) {
                        console.error('Erreur lors de la création du salon de like :', error);
                          await buttonInteraction.deferUpdate();                  
                        await interaction.followUp({ content: 'Erreur lors de la création du salon de like.' });
                      }
                    } else {
                      if (!buttonInteraction.deferred && !buttonInteraction.replied) {
                        await buttonInteraction.deferUpdate();
                        await buttonInteraction.followUp({ content: 'Veuillez créer un profil dans <#1127181162666807296>.', ephemeral: true });
                      }                  
                    }
                  } catch (error) {
                    console.error('Une erreur s\'est produite lors de l\'exécution de la commande :', error);
                  }
                }
              
                if (!buttonInteraction.deferred && !buttonInteraction.replied) {
                  await buttonInteraction.deferUpdate().catch(console.error);
                }
              });                     

              buttonCollector.on('end', () => {
              });
            }
          }
      } catch (error) {
        if (error.code === 10062) {
          console.error('Erreur : Interaction inconnue');
          // Gérer l'erreur ici, par exemple en envoyant une réponse appropriée à l'utilisateur
        } else {
          console.error('Une erreur s\'est produite lors de la collecte de l\'interaction :', error);
        }
      }
    });

      collector.on('end', () => {
        // Collector ended, clean up if necessary
        interactionCollectors.delete('searchMenu');
      });
    }
  },
};
