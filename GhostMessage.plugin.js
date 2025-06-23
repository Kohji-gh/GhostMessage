/**
 * @name GhostMessage
 * @author _.kohji (Gambi)
 * @version 1.0.0
 * @description This plugin deletes messages the fucking millisecond they're sent.
 * @source https://github.com/Kohji-gh/GhostMessage
 * @updateUrl https://github.com/Kohji-gh/GhostMessage/blob/main/GhostMessage.plugin.js
 */

module.exports = class GhostMessage {
  constructor() {
    this.defaultSettings = {
      deleteDelay: 2,
      ghostModeEnabled: true,
      enabledColor: '#FFFFFF',
      disabledColor: '#b9bbbe'
    };
    this.settings = {};
    this.observer = null;
    this.insertionTimeout = null;
    this.isInserting = false;
  }

  load() {}

  start() {
    try {
      this.settings = BdApi.loadData(this.getName(), "settings") || this.defaultSettings;
      this.Patcher = BdApi.Patcher;
      this.MessageActions = BdApi.findModuleByProps("sendMessage", "editMessage", "deleteMessage");
      this.UserStore = BdApi.findModuleByProps("getCurrentUser");
      this.React = BdApi.React;
      
      // Get Discord selectors - same as Translator plugin
      this.DiscordSelectors = BdApi.findModuleByProps("button", "buttons") || {};
      this.DiscordClasses = BdApi.findModuleByProps("Chat") || {};
      
      if (!this.MessageActions) {
        console.error("GhostMessage: Could not find MessageActions module");
        return;
      }
      
      this.patchSendMessage();
      this.addIcon();
    } catch (error) {
      console.error("GhostMessage: Error during start:", error);
    }
  }

  stop() {
    try {
      if (this.Patcher) {
        this.Patcher.unpatchAll(this.getName());
      }
      this.removeIcon();
      if (this.insertionTimeout) {
        clearTimeout(this.insertionTimeout);
        this.insertionTimeout = null;
      }
    } catch (error) {
      console.error("GhostMessage: Error during stop:", error);
    }
  }

  patchSendMessage() {
    try {
      this.Patcher.after(this.getName(), this.MessageActions, "sendMessage", async (_, [channelId, message], returnValue) => {
        if (!this.settings.ghostModeEnabled) return;
        if (!message) return;
        
        try {
          const sentMessage = await returnValue;
          if (sentMessage && sentMessage.body && sentMessage.body.id) {
            const messageId = sentMessage.body.id;
            setTimeout(() => {
              try {
                this.MessageActions.deleteMessage(channelId, messageId);
              } catch (deleteError) {
                console.error("GhostMessage: Error deleting message:", deleteError);
              }
            }, this.settings.deleteDelay * 1000);
          }
        } catch (error) {
          console.error("GhostMessage: Error processing sent message:", error);
        }
      });
    } catch (error) {
      console.error("GhostMessage: Error patching sendMessage:", error);
    }
  }

  addIcon() {
    try {
      // Clean up any existing observer
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      // Observer for dynamic insertion - same pattern as Translator
      this.observer = new MutationObserver(() => {
        if (this.isInserting) return;
        
        if (this.insertionTimeout) {
          clearTimeout(this.insertionTimeout);
        }
        
        this.insertionTimeout = setTimeout(() => {
          this.insertGhostIconSafely();
        }, 100);
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Initial insertion
      setTimeout(() => this.insertGhostIconSafely(), 1000);
    } catch (error) {
      console.error("GhostMessage: Error adding icon:", error);
    }
  }

  insertGhostIconSafely() {
    if (this.isInserting) return;
    this.isInserting = true;

    try {
      // Check if icon already exists
      if (document.querySelector(".ghost-message-button")) {
        this.isInserting = false;
        return;
      }

      // Find all chat button containers - same approach as Translator
      const buttonContainers = this.findButtonContainers();
      
      buttonContainers.forEach(buttonbar => {
        if (buttonbar && !buttonbar.querySelector(".ghost-message-button")) {
          this.insertGhostIcon(buttonbar);
        }
      });
      
    } catch (error) {
      console.error("GhostMessage: Error in insertGhostIconSafely:", error);
    }
    
    this.isInserting = false;
  }

  findButtonContainers() {
    try {
      const containers = [];
      
      // Primary approach: Use DiscordSelectors like Translator plugin
      if (this.DiscordSelectors && this.DiscordSelectors.Chat && this.DiscordSelectors.Chat.buttons) {
        const primary = document.querySelectorAll(this.DiscordSelectors.Chat.buttons);
        containers.push(...primary);
      }
      
      // Fallback selectors - common Discord button container classes
      const fallbackSelectors = [
        '.buttons-3JBrkn',  // Most common Discord buttons class
        '[class*="buttons-"]',
        '[class*="channelTextArea"] [class*="buttons"]',
        '.channelTextArea-2VhZ6z .buttons-3JBrkn'
      ];
      
      fallbackSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (!containers.includes(el)) {
              containers.push(el);
            }
          });
        } catch (e) {
          // Ignore selector errors
        }
      });
      
      return containers;
    } catch (error) {
      console.error("GhostMessage: Error finding button containers:", error);
      return [];
    }
  }

  insertGhostIcon(buttonbar) {
    try {
      // Create the button using Discord's button class - same as Translator
      const ghostButton = this.createButton();
      
      // Insert as the FIRST child (leftmost position) - prepend to container
      if (buttonbar.firstChild) {
        buttonbar.insertBefore(ghostButton, buttonbar.firstChild);
      } else {
        buttonbar.appendChild(ghostButton);
      }
      
      console.log("GhostMessage: Button inserted successfully");
    } catch (error) {
      console.error("GhostMessage: Error inserting ghost icon:", error);
    }
  }

  createButton() {
    try {
      // Get Discord's button class - same pattern as Translator
      const buttonClass = this.getDiscordButtonClass();
      
      const button = document.createElement("button");
      button.className = `${buttonClass} ghost-message-button`;
      button.type = "button";
      button.setAttribute("aria-label", "Toggle Ghost Mode");
      
      // Use the same SVG structure as your original
      button.innerHTML = this.getGhostSVG();
      
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleGhostMode();
      });
      
      this.updateButtonStyle(button);
      
      return button;
    } catch (error) {
      console.error("GhostMessage: Error creating button:", error);
      return null;
    }
  }

  getDiscordButtonClass() {
    try {
      // Try to get Discord's button class like Translator does
      if (this.DiscordClasses && this.DiscordClasses.Chat && this.DiscordClasses.Chat.button) {
        return this.DiscordClasses.Chat.button;
      }
      
      // Fallback to common Discord button classes
      const commonClasses = [
        'button-38aScr',  // Most common Discord button class
        'button-1YfofB',
        'button-f2h6uQ'
      ];
      
      // Check which class exists in the DOM
      for (const className of commonClasses) {
        if (document.querySelector(`.${className}`)) {
          return className;
        }
      }
      
      // Ultimate fallback
      return 'button-38aScr';
    } catch (error) {
      console.error("GhostMessage: Error getting Discord button class:", error);
      return 'button-38aScr';
    }
  }

  getButtonSelector() {
    try {
      if (this.DiscordSelectors && this.DiscordSelectors.Chat && this.DiscordSelectors.Chat.button) {
        return this.DiscordSelectors.Chat.button;
      }
      
      // Fallback button selectors
      return 'button[class*="button-"]';
    } catch (error) {
      return 'button';
    }
  }

  getGhostSVG() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.5 2 6 4.5 6 8v10c0 0.5 0.2 1 0.6 1.4L8 20.8l1.4-1.4L12 20.8l2.6-1.4L16 20.8l1.4 1.4c0.4-0.4 0.6-0.9 0.6-1.4V8c0-3.5-2.5-6-6-6zm-2.5 7c-0.8 0-1.5-0.7-1.5-1.5S8.7 6 9.5 6s1.5 0.7 1.5 1.5S10.3 9 9.5 9zm5 0c-0.8 0-1.5-0.7-1.5-1.5S13.7 6 14.5 6s1.5 0.7 1.5 1.5S15.3 9 14.5 9z"/>
      </svg>
    `;
  }

  updateButtonStyle(button) {
    try {
      const isEnabled = this.settings.ghostModeEnabled;
      
      // Remove any white background and use Discord's native button styling
      button.style.cssText = `
        background: transparent !important;
        border: none !important;
        outline: none !important;
        opacity: ${isEnabled ? '1' : '0.5'};
        color: ${isEnabled ? this.settings.enabledColor : this.settings.disabledColor};
      `;
      
      button.title = isEnabled ? 
        `Ghost Mode: ON (${this.settings.deleteDelay}s delay)` : 
        'Ghost Mode: OFF';
        
      // Add hover effect
      button.onmouseenter = () => {
        button.style.color = isEnabled ? this.settings.enabledColor : '#dcddde';
        button.style.backgroundColor = 'transparent';
      };
      button.onmouseleave = () => {
        button.style.color = isEnabled ? this.settings.enabledColor : this.settings.disabledColor;
        button.style.backgroundColor = 'transparent';
      };
    } catch (error) {
      console.error("GhostMessage: Error updating button style:", error);
    }
  }

  toggleGhostMode() {
    try {
      this.settings.ghostModeEnabled = !this.settings.ghostModeEnabled;
      BdApi.saveData(this.getName(), "settings", this.settings);
      
      // Update all ghost buttons
      document.querySelectorAll(".ghost-message-button").forEach(button => {
        this.updateButtonStyle(button);
      });
      
      BdApi.showToast(`Ghost Mode: ${this.settings.ghostModeEnabled ? 'ON' : 'OFF'}`, {
        type: this.settings.ghostModeEnabled ? 'success' : 'info'
      });
    } catch (error) {
      console.error("GhostMessage: Error toggling ghost mode:", error);
    }
  }

  removeIcon() {
    try {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      
      document.querySelectorAll(".ghost-message-button").forEach(el => {
        try {
          el.remove();
        } catch (removeError) {
          console.error("GhostMessage: Error removing button:", removeError);
        }
      });
    } catch (error) {
      console.error("GhostMessage: Error in removeIcon:", error);
    }
  }

  getName() { return "GhostMessage"; }
  getAuthor() { return "_.kohji (Gambi)"; }
  getVersion() { return "1.0.0"; }
  getDescription() { return "Deletes sent messages instantly inspired by Kyza's GhostMessage plugin made 2000 years ago."; }

  getSettingsPanel() {
    try {
      const { useState, useEffect } = BdApi.React;
      const SettingsComponent = () => {
        const [delayValue, setDelayValue] = useState(this.settings.deleteDelay);
        const [enabledColor, setEnabledColor] = useState(this.settings.enabledColor);
        const [disabledColor, setDisabledColor] = useState(this.settings.disabledColor);
        
        useEffect(() => {
          this.settings.deleteDelay = delayValue;
          this.settings.enabledColor = enabledColor;
          this.settings.disabledColor = disabledColor;
          BdApi.saveData(this.getName(), "settings", this.settings);
          
          // Update all existing buttons with new colors
          document.querySelectorAll(".ghost-message-button").forEach(button => {
            this.updateButtonStyle(button);
          });
        }, [delayValue, enabledColor, disabledColor]);
        
        return BdApi.React.createElement("div", {
          style: { padding: "20px", color: "var(--text-normal)" }
        }, [
          BdApi.React.createElement("h3", {
            key: "title",
            style: { marginBottom: "20px" }
          }, "GhostMessage Settings"),
          
          // Delete Delay Section
          BdApi.React.createElement("div", {
            key: "delay-section",
            style: { marginBottom: "25px" }
          }, [
            BdApi.React.createElement("label", {
              key: "delay-label",
              style: { display: "block", marginBottom: "10px", fontWeight: "600" }
            }, `Delete Delay: ${delayValue.toFixed(1)} seconds`),
            BdApi.React.createElement("input", {
              key: "delay-slider",
              type: "range",
              min: 0,
              max: 10,
              step: 0.1,
              value: delayValue,
              style: { width: "100%", marginBottom: "10px" },
              onChange: (e) => setDelayValue(Number(e.target.value))
            }),
            BdApi.React.createElement("div", {
              key: "delay-range-labels",
              style: { display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }
            }, [
              BdApi.React.createElement("span", { key: "min" }, "0s"),
              BdApi.React.createElement("span", { key: "max" }, "10s")
            ])
          ]),
          
          // Color Customization Section
          BdApi.React.createElement("div", {
            key: "color-section"
          }, [
            BdApi.React.createElement("h4", {
              key: "color-title",
              style: { marginBottom: "15px", fontWeight: "600" }
            }, "Button Colors"),
            
            // Enabled Color
            BdApi.React.createElement("div", {
              key: "enabled-color-container",
              style: { marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }
            }, [
              BdApi.React.createElement("label", {
                key: "enabled-color-label",
                style: { minWidth: "120px" }
              }, "Enabled Color:"),
              BdApi.React.createElement("input", {
                key: "enabled-color-input",
                type: "color",
                value: enabledColor,
                style: { 
                  width: "50px", 
                  height: "30px", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                },
                onChange: (e) => setEnabledColor(e.target.value)
              }),
              BdApi.React.createElement("input", {
                key: "enabled-color-text",
                type: "text",
                value: enabledColor,
                style: { 
                  marginLeft: "10px",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--background-modifier-accent)",
                  backgroundColor: "var(--input-background)",
                  color: "var(--text-normal)",
                  width: "80px"
                },
                onChange: (e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    setEnabledColor(e.target.value);
                  }
                }
              })
            ]),
            
            // Disabled Color
            BdApi.React.createElement("div", {
              key: "disabled-color-container",
              style: { marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }
            }, [
              BdApi.React.createElement("label", {
                key: "disabled-color-label",
                style: { minWidth: "120px" }
              }, "Disabled Color:"),
              BdApi.React.createElement("input", {
                key: "disabled-color-input",
                type: "color",
                value: disabledColor,
                style: { 
                  width: "50px", 
                  height: "30px", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                },
                onChange: (e) => setDisabledColor(e.target.value)
              }),
              BdApi.React.createElement("input", {
                key: "disabled-color-text",
                type: "text",
                value: disabledColor,
                style: { 
                  marginLeft: "10px",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--background-modifier-accent)",
                  backgroundColor: "var(--input-background)",
                  color: "var(--text-normal)",
                  width: "80px"
                },
                onChange: (e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    setDisabledColor(e.target.value);
                  }
                }
              })
            ]),
            
            // Preview Section
            BdApi.React.createElement("div", {
              key: "preview-section",
              style: { 
                marginTop: "20px", 
                padding: "15px", 
                backgroundColor: "var(--background-secondary)",
                borderRadius: "8px"
              }
            }, [
              BdApi.React.createElement("h5", {
                key: "preview-title",
                style: { marginBottom: "10px", fontWeight: "600" }
              }, "Preview:"),
              
              BdApi.React.createElement("div", {
                key: "preview-buttons",
                style: { display: "flex", gap: "10px", alignItems: "center" }
              }, [
                BdApi.React.createElement("div", {
                  key: "enabled-preview",
                  style: {
                    padding: "8px",
                    backgroundColor: "transparent",
                    borderRadius: "4px",
                    border: "1px solid var(--background-modifier-accent)"
                  }
                }, [
                  BdApi.React.createElement("svg", {
                    key: "enabled-svg",
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: enabledColor,
                    style: { display: "block" }
                  }, [
                    BdApi.React.createElement("path", {
                      key: "enabled-path",
                      d: "M12 2C8.5 2 6 4.5 6 8v10c0 0.5 0.2 1 0.6 1.4L8 20.8l1.4-1.4L12 20.8l2.6-1.4L16 20.8l1.4 1.4c0.4-0.4 0.6-0.9 0.6-1.4V8c0-3.5-2.5-6-6-6zm-2.5 7c-0.8 0-1.5-0.7-1.5-1.5S8.7 6 9.5 6s1.5 0.7 1.5 1.5S10.3 9 9.5 9zm5 0c-0.8 0-1.5-0.7-1.5-1.5S13.7 6 14.5 6s1.5 0.7 1.5 1.5S15.3 9 14.5 9z"
                    })
                  ])
                ]),
                BdApi.React.createElement("span", {
                  key: "enabled-text",
                  style: { fontSize: "14px" }
                }, "Enabled"),
                
                BdApi.React.createElement("div", {
                  key: "disabled-preview",
                  style: {
                    padding: "8px",
                    backgroundColor: "transparent",
                    borderRadius: "4px",
                    border: "1px solid var(--background-modifier-accent)",
                    opacity: "0.5"
                  }
                }, [
                  BdApi.React.createElement("svg", {
                    key: "disabled-svg",
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: disabledColor,
                    style: { display: "block" }
                  }, [
                    BdApi.React.createElement("path", {
                      key: "disabled-path",
                      d: "M12 2C8.5 2 6 4.5 6 8v10c0 0.5 0.2 1 0.6 1.4L8 20.8l1.4-1.4L12 20.8l2.6-1.4L16 20.8l1.4 1.4c0.4-0.4 0.6-0.9 0.6-1.4V8c0-3.5-2.5-6-6-6zm-2.5 7c-0.8 0-1.5-0.7-1.5-1.5S8.7 6 9.5 6s1.5 0.7 1.5 1.5S10.3 9 9.5 9zm5 0c-0.8 0-1.5-0.7-1.5-1.5S13.7 6 14.5 6s1.5 0.7 1.5 1.5S15.3 9 14.5 9z"
                    })
                  ])
                ]),
                BdApi.React.createElement("span", {
                  key: "disabled-text",
                  style: { fontSize: "14px" }
                }, "Disabled")
              ])
            ])
          ])
        ]);
      };
      return BdApi.React.createElement(SettingsComponent);
    } catch (error) {
      console.error("GhostMessage: Error creating settings panel:", error);
      return null;
    }
  }
};
