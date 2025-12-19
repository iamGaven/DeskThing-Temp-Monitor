# DeskThing TempMonitor

**TempMonitor** is a temperature monitoring app for your PC designed to work with DeskThing, the Spotify car display system. It shows real-time CPU and GPU temperatures on DeskThing using a two-part system:

1. **C# Server (HWInfoBridge)**  
   - This server communicates with [HWiNFO](https://www.hwinfo.com/) to read hardware data using the [HWHash](https://github.com/layer07/HWHash) C# package.  
   - HWInfoBridge is precompiled and automatically starts when the DeskThing Vite app runs.  

2. **Vite Frontend**  
   - Connects to the C# server to retrieve CPU and GPU temperatures.  
   - Displays the data on DeskThing in a clean and responsive UI.  

---

## Requirements

- [HWiNFO](https://www.hwinfo.com/) installed on your PC.  

### HWiNFO Setup

1. Open HWiNFO and go to **Settings**.  
2. Check the **Shared Memory Support** box.  
   - Note: The free version has a 12-hour limit for shared memory access. A workaround is in progress, or you can purchase the Pro version to remove this limitation.  
3. Optionally, enable **Sensors-Only Mode** to keep the interface clean.  

Once set up, you can minimize HWiNFO and the DeskThing TempMonitor app will run in the background automatically.  

---

## Usage

- Start the DeskThing Vite app. HWInfoBridge will automatically run in the background.  
- The app will read CPU and GPU temperatures from HWiNFO and display them on DeskThing.  

---

## Notes

- Designed for use with DeskThing on car displays.  
- Works with both free and Pro versions of HWiNFO (free version limited to 12 hours per session).  
- Minimize the app to let it run in the background seamlessly.  
