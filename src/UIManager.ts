class UIManager {
    private controlPanelDiv = document.createElement("div");
    private statusPanelDiv = document.createElement("div");
  
    constructor(private app: HTMLElement) {
      this.app.append(this.controlPanelDiv);
      this.app.append(this.statusPanelDiv);
    }
  
    initializeButtons(onMove: (lat: number, lng: number) => void, onReset: () => void, onGeoToggle: () => void) {
      const directions = [
        { text: "⬆️", offset: { lat: 0.0001, lng: 0 } },
        { text: "⬇️", offset: { lat: -0.0001, lng: 0 } },
        { text: "⬅️", offset: { lat: 0, lng: -0.0001 } },
        { text: "➡️", offset: { lat: 0, lng: 0.0001 } },
      ];
      directions.forEach((dir) => {
        const button = document.createElement("button");
        button.innerHTML = dir.text;
        button.addEventListener("click", () => onMove(dir.offset.lat, dir.offset.lng));
        this.controlPanelDiv.appendChild(button);
      });
  
      const resetButton = this.createButton("🚮", onReset);
      const geoButton = this.createButton("🌐", onGeoToggle);
      this.controlPanelDiv.append(resetButton, geoButton);
    }
  
    updateStatusPanel(coins: number) {
      this.statusPanelDiv.innerHTML = `Collected Coins: ${coins}`;
    }
  
    private createButton(label: string, onClick: () => void): HTMLButtonElement {
      const button = document.createElement("button");
      button.innerHTML = label;
      button.addEventListener("click", onClick);
      return button;
    }
  }
  
  export { UIManager };