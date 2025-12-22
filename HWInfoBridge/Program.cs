using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;

Console.WriteLine("=================================");
Console.WriteLine("   HWHash WebSocket Server");
Console.WriteLine("=================================\n");

// Configure HWHash
Console.WriteLine("⚙️  Configuring HWHash...");
HWHash.SetDelay(500);

// Launch HWHash
Console.WriteLine("🚀 Launching HWHash...");

if (!HWHash.Launch())
{
    Console.WriteLine("\n❌ FAILED to launch HWHash!");
    Console.WriteLine("\nMake sure:");
    Console.WriteLine("  1. HWiNFO is running");
    Console.WriteLine("  2. Shared Memory Support is enabled");
    Console.WriteLine("  3. Sensors window is open\n");
    Console.WriteLine("Press any key to exit...");
    Console.ReadKey();
    return;
}

Console.WriteLine("✅ HWHash launched successfully!");

// Wait for sensors to populate
Console.WriteLine("⏳ Waiting for sensor data...\n");
await Task.Delay(2000);

// Check stats
var stats = HWHash.GetHWHashStats();
Console.WriteLine($"📊 Stats:");
Console.WriteLine($"   Total Sensors: {stats.TotalEntries}");
Console.WriteLine($"   Categories: {stats.TotalCategories}");
Console.WriteLine($"   Sensors Loaded: {HWHash.Sensors.Count}\n");

if (HWHash.Sensors.Count == 0)
{
    Console.WriteLine("⚠️  WARNING: No sensors loaded. Continuing anyway...\n");
}

// Build web server
var builder = WebApplication.CreateBuilder(args);

// Configure logging to reduce verbosity
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Warning);

// Add SignalR
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:*",
            "http://localhost:8891",
            "http://localhost:8891/client/#/app/weatherwaves"

        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});
builder.WebHost.UseUrls("http://localhost:5000");

var app = builder.Build();

app.UseCors("AllowAll");
app.UseRouting();

// Map SignalR Hub
app.MapHub<SensorHub>("/sensorhub");

// REST endpoints
app.MapGet("/", () => Results.Text(
    "HWHash WebSocket Server\n\n" +
    $"Sensors: {HWHash.Sensors.Count}\n" +
    $"Categories: {stats.TotalCategories}\n\n" +
    "Endpoints:\n" +
    "  WebSocket: ws://localhost:5000/sensorhub\n\n" +
    "  GET /api/sensors/all       - All sensors (full)\n" +
    "  GET /api/sensors/mini      - All sensors (minified)\n" +
    "  GET /api/sensors/relevant  - Curated important sensors\n" +
    "  GET /api/temps             - All temperature sensors\n" +
    "  GET /api/temps/cpu-gpu     - CPU & GPU temps only\n" +
    "  GET /api/temps/cpu         - CPU temperature only\n" +
    "  GET /api/temps/gpu         - GPU temperature only\n" +
    "  GET /api/usage             - All usage stats\n" +
    "  GET /api/usage/cpu         - CPU utility only\n" +
    "  GET /api/usage/memory-load - Memory load percentage only\n" +
    "  GET /api/usage/memory-used - Memory used (GB) only\n" +
    "  GET /api/usage/gpu         - GPU core load only\n" +
    "  GET /api/stats             - Performance stats"
));

// All sensors (full version)
app.MapGet("/api/sensors/all", () =>
{
    var sensors = HWHash.GetOrderedList();
    return Results.Json(new
    {
        timestamp = DateTime.Now,
        count = sensors.Count,
        sensors = sensors
    });
});

// All sensors (minified - smaller payload, faster)
app.MapGet("/api/sensors/mini", () =>
{
    var sensors = HWHash.GetOrderedListMini();
    return Results.Json(new
    {
        timestamp = DateTime.Now,
        count = sensors.Count,
        sensors = sensors
    });
});

// Relevant sensors only (curated list)
app.MapGet("/api/sensors/relevant", () =>
{
    var sensors = HWHash.GetRelevantList();
    return Results.Json(new
    {
        timestamp = DateTime.Now,
        count = sensors.Count,
        sensors = sensors
    });
});

// All temperature sensors
app.MapGet("/api/temps", () =>
{
    var allSensors = HWHash.GetOrderedList();

    var temps = allSensors
        .Where(s => s.ReadingType == "Temperature")
        .Select(s => new
        {
            name = s.NameDefault,
            parent = s.ParentNameDefault,
            value = s.ValueNow,
            unit = s.Unit,
            min = s.ValueMin,
            max = s.ValueMax,
            avg = s.ValueAvg
        })
        .ToList();

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        count = temps.Count,
        temperatures = temps
    });
});

// CPU and GPU temperatures only
app.MapGet("/api/temps/cpu-gpu", () =>
{
    var allSensors = HWHash.GetOrderedList();

    // Get CPU Package temperature
    var cpuPackage = allSensors
        .FirstOrDefault(s => s.ReadingType == "Temperature" &&
                            s.NameDefault == "CPU Package");

    // Get GPU Temperature
    var gpuTemp = allSensors
        .FirstOrDefault(s => s.ReadingType == "Temperature" &&
                            s.NameDefault == "GPU Temperature");

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        cpu = cpuPackage.NameDefault != null ? new
        {
            name = cpuPackage.NameDefault,
            value = cpuPackage.ValueNow,
            unit = cpuPackage.Unit,
            min = cpuPackage.ValueMin,
            max = cpuPackage.ValueMax
        } : null,
        gpu = gpuTemp.NameDefault != null ? new
        {
            name = gpuTemp.NameDefault,
            value = gpuTemp.ValueNow,
            unit = gpuTemp.Unit,
            min = gpuTemp.ValueMin,
            max = gpuTemp.ValueMax
        } : null
    });
});

// CPU temperature only
app.MapGet("/api/temps/cpu", () =>
{
    var allSensors = HWHash.GetOrderedList();

    var cpuPackage = allSensors
        .FirstOrDefault(s => s.ReadingType == "Temperature" &&
                            s.NameDefault == "CPU Package");

    if (cpuPackage.NameDefault == null)
    {
        return Results.Json(new
        {
            
            timestamp = DateTime.Now,
            error = "CPU temperature sensor not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = "CPU Temp",
        value = cpuPackage.ValueNow,
        unit = cpuPackage.Unit,
        min = cpuPackage.ValueMin,
        max = cpuPackage.ValueMax,
        avg = cpuPackage.ValueAvg
    });
});

// GPU temperature only
app.MapGet("/api/temps/gpu", () =>
{
    var allSensors = HWHash.GetOrderedList();

    var gpuTemp = allSensors
        .FirstOrDefault(s => s.ReadingType == "Temperature" &&
                            s.NameDefault == "GPU Temperature");

    if (gpuTemp.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = "GPU temperature sensor not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = gpuTemp.NameDefault,
        value = gpuTemp.ValueNow,
        unit = gpuTemp.Unit,
        min = gpuTemp.ValueMin,
        max = gpuTemp.ValueMax,
        avg = gpuTemp.ValueAvg
    });
});

// Hardware usage statistics (all usage metrics)
app.MapGet("/api/usage", () =>
{
    var relevantSensors = HWHash.GetRelevantList();
    var allSensors = HWHash.GetOrderedList();

    // Get Total CPU Utility from full list (more accurate than Total CPU Usage)
    var totalCpuUtility = allSensors
        .FirstOrDefault(s => s.NameDefault == "Total CPU Utility");

    // Get main metrics from relevant list
    var physicalMemoryLoad = relevantSensors
        .FirstOrDefault(s => s.NameDefault == "Physical Memory Load");

    var physicalMemoryUsed = relevantSensors
        .FirstOrDefault(s => s.NameDefault == "Physical Memory Used");

    var gpuCoreLoad = relevantSensors
        .FirstOrDefault(s => s.NameDefault == "GPU Core Load");

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        totalCpuUtility = totalCpuUtility.NameDefault != null ? new
        {
            name = totalCpuUtility.NameDefault,
            value = totalCpuUtility.ValueNow,
            unit = totalCpuUtility.Unit
        } : null,
        physicalMemoryLoad = physicalMemoryLoad.NameDefault != null ? new
        {
            name = physicalMemoryLoad.NameCustom,
            value = physicalMemoryLoad.ValueNow,
            unit = physicalMemoryLoad.Unit
        } : null,
        physicalMemoryUsed = physicalMemoryUsed.NameDefault != null ? new
        {
            name = physicalMemoryUsed.NameCustom,
            value = physicalMemoryUsed.ValueNow,
            unit = physicalMemoryUsed.Unit
        } : null,
        gpuCoreLoad = gpuCoreLoad.NameDefault != null ? new
        {
            name = gpuCoreLoad.NameCustom,
            value = gpuCoreLoad.ValueNow,
            unit = gpuCoreLoad.Unit
        } : null
    });
});

// CPU utility only
app.MapGet("/api/usage/cpu", () =>
{
    var allSensors = HWHash.GetOrderedList();

    var totalCpuUtility = allSensors
        .FirstOrDefault(s => s.NameDefault == "Total CPU Utility");

    if (totalCpuUtility.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = "CPU utility sensor not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = totalCpuUtility.NameDefault,
        value = totalCpuUtility.ValueNow,
        unit = totalCpuUtility.Unit,
        min = totalCpuUtility.ValueMin,
        max = totalCpuUtility.ValueMax,
        avg = totalCpuUtility.ValueAvg
    });
});

// Memory load percentage only
app.MapGet("/api/usage/memory-load", () =>
{
    var relevantSensors = HWHash.GetRelevantList();

    var physicalMemoryLoad = relevantSensors
        .FirstOrDefault(s => s.NameDefault == "Physical Memory Load");

    if (physicalMemoryLoad.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = "Physical memory load sensor not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = "Memory Usage",
        value = physicalMemoryLoad.ValueNow,
        unit = physicalMemoryLoad.Unit,
        min = physicalMemoryLoad.ValueMin,
        max = physicalMemoryLoad.ValueMax,
        avg = physicalMemoryLoad.ValueAvg
    });
});

// Memory used (GB) only
app.MapGet("/api/usage/memory-used", () =>
{
    var relevantSensors = HWHash.GetRelevantList();

    var physicalMemoryUsed = relevantSensors
        .FirstOrDefault(s => s.NameDefault == "Physical Memory Used");

    if (physicalMemoryUsed.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = "Physical memory used sensor not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = physicalMemoryUsed.NameCustom ?? physicalMemoryUsed.NameDefault,
        value = physicalMemoryUsed.ValueNow,
        unit = physicalMemoryUsed.Unit,
        min = physicalMemoryUsed.ValueMin,
        max = physicalMemoryUsed.ValueMax,
        avg = physicalMemoryUsed.ValueAvg
    });
});

// GPU core load only
app.MapGet("/api/usage/gpu", () =>
{
    var relevantSensors = HWHash.GetRelevantList();

    var gpuCoreLoad = relevantSensors
        .FirstOrDefault(s => s.NameDefault == "GPU Core Load");

    if (gpuCoreLoad.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = "GPU core load sensor not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = "GPU Usage",
        value = gpuCoreLoad.ValueNow,
        unit = gpuCoreLoad.Unit,
        min = gpuCoreLoad.ValueMin,
        max = gpuCoreLoad.ValueMax,
        avg = gpuCoreLoad.ValueAvg
    });
});

// Stats
app.MapGet("/api/stats", () =>
{
    var currentStats = HWHash.GetHWHashStats();
    return Results.Json(new
    {
        collectionTime = currentStats.CollectionTime,
        totalEntries = currentStats.TotalEntries,
        totalCategories = currentStats.TotalCategories,
        sensorsLoaded = HWHash.Sensors.Count
    });
});

// Get list of all available network adapters
app.MapGet("/api/network/adapters", () =>
{
    var allSensors = HWHash.GetOrderedList();

    // Get all network adapters that have DL/UP rate sensors
    var networkAdapters = allSensors
        .Where(s => s.NameDefault == "Current DL rate" || s.NameDefault == "Current UP rate")
        .Select(s => new
        {
            parentName = s.ParentNameDefault,
            parentCustomName = s.ParentNameCustom,
            parentInstance = s.ParentInstance,
            sensorIndex = s.SensorIndex
        })
        .GroupBy(s => s.sensorIndex)
        .Select(g => g.First())
        .ToList();

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        count = networkAdapters.Count,
        adapters = networkAdapters
    });
});

// Download rate for specific network adapter by sensor index
app.MapGet("/api/network/download/{sensorIndex}", (int sensorIndex) =>
{
    var allSensors = HWHash.GetOrderedList();

    var downloadRate = allSensors
        .FirstOrDefault(s => s.NameDefault == "Current DL rate" && s.SensorIndex == sensorIndex);

    if (downloadRate.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = $"Current DL rate sensor not found for adapter with sensor index {sensorIndex}"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = "Download Rate",
        adapter = downloadRate.ParentNameCustom ?? downloadRate.ParentNameDefault,
        value = downloadRate.ValueNow,
        unit = downloadRate.Unit,
        min = downloadRate.ValueMin,
        max = downloadRate.ValueMax,
        avg = downloadRate.ValueAvg
    });
});

// Upload rate for specific network adapter by sensor index
app.MapGet("/api/network/upload/{sensorIndex}", (int sensorIndex) =>
{
    var allSensors = HWHash.GetOrderedList();

    var uploadRate = allSensors
        .FirstOrDefault(s => s.NameDefault == "Current UP rate" && s.SensorIndex == sensorIndex);

    if (uploadRate.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = $"Current UP rate sensor not found for adapter with sensor index {sensorIndex}"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        name = "Upload Rate",
        adapter = uploadRate.ParentNameCustom ?? uploadRate.ParentNameDefault,
        value = uploadRate.ValueNow,
        unit = uploadRate.Unit,
        min = uploadRate.ValueMin,
        max = uploadRate.ValueMax,
        avg = uploadRate.ValueAvg
    });
});

// Get both DL and UP rates for specific network adapter
app.MapGet("/api/network/rates/{sensorIndex}", (int sensorIndex) =>
{
    var allSensors = HWHash.GetOrderedList();

    var downloadRate = allSensors
        .FirstOrDefault(s => s.NameDefault == "Current DL rate" && s.SensorIndex == sensorIndex);

    var uploadRate = allSensors
        .FirstOrDefault(s => s.NameDefault == "Current UP rate" && s.SensorIndex == sensorIndex);

    if (downloadRate.NameDefault == null && uploadRate.NameDefault == null)
    {
        return Results.Json(new
        {
            timestamp = DateTime.Now,
            error = $"Network adapter with sensor index {sensorIndex} not found"
        });
    }

    return Results.Json(new
    {
        timestamp = DateTime.Now,
        adapter = downloadRate.ParentNameCustom ?? uploadRate.ParentNameCustom ??
                  downloadRate.ParentNameDefault ?? uploadRate.ParentNameDefault,
        download = downloadRate.NameDefault != null ? new
        {
            value = downloadRate.ValueNow,
            unit = downloadRate.Unit,
            min = downloadRate.ValueMin,
            max = downloadRate.ValueMax,
            avg = downloadRate.ValueAvg
        } : null,
        upload = uploadRate.NameDefault != null ? new
        {
            value = uploadRate.ValueNow,
            unit = uploadRate.Unit,
            min = uploadRate.ValueMin,
            max = uploadRate.ValueMax,
            avg = uploadRate.ValueAvg
        } : null
    });
});

// Get ordered sensor list
app.MapGet("/api/ordered", () => HWHash.GetOrderedList());

Console.WriteLine("🚀 WebSocket Server running at http://localhost:5000");
Console.WriteLine("📡 SignalR Hub: ws://localhost:5000/sensorhub");
Console.WriteLine("🌐 Test: http://localhost:5000\n");
Console.WriteLine("Waiting for client connections...\n");

app.Run();

// SensorHub class
public class SensorHub : Hub
{
    private static Timer? _broadcastTimer;
    private static IHubContext<SensorHub>? _hubContext;
    private static int _connectedClients = 0;
    private static readonly object _lock = new();

    public SensorHub(IHubContext<SensorHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public override async Task OnConnectedAsync()
    {
        lock (_lock)
        {
            _connectedClients++;
            Console.WriteLine($"✅ Client connected. Total: {_connectedClients}");

            if (_connectedClients == 1)
            {
                StartBroadcasting();
            }
        }

        // Send initial data (use minified for better performance)
        try
        {
            var sensors = HWHash.GetOrderedListMini(); // Minified version
            var stats = HWHash.GetHWHashStats();

            await Clients.Caller.SendAsync("SensorUpdate", sensors);
            await Clients.Caller.SendAsync("StatsUpdate", new
            {
                collectionTime = stats.CollectionTime,
                totalEntries = stats.TotalEntries,
                totalCategories = stats.TotalCategories
            });

            Console.WriteLine($"   Sent {sensors.Count} sensors (minified) to client");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️  Error sending initial data: {ex.Message}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        lock (_lock)
        {
            _connectedClients--;
            Console.WriteLine($"❌ Client disconnected. Total: {_connectedClients}");

            if (_connectedClients == 0)
            {
                StopBroadcasting();
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private static void StartBroadcasting()
    {
        Console.WriteLine("▶️  Started broadcasting (every 500ms)");

        _broadcastTimer = new Timer(async _ =>
        {
            try
            {
                if (_hubContext != null && _connectedClients > 0)
                {
                    // Use minified version for less bandwidth
                    var sensors = HWHash.GetOrderedListMini();
                    var stats = HWHash.GetHWHashStats();

                    await _hubContext.Clients.All.SendAsync("SensorUpdate", sensors);
                    await _hubContext.Clients.All.SendAsync("StatsUpdate", new
                    {
                        collectionTime = stats.CollectionTime,
                        totalEntries = stats.TotalEntries,
                        totalCategories = stats.TotalCategories
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️  Broadcast error: {ex.Message}");
            }
        }, null, TimeSpan.Zero, TimeSpan.FromMilliseconds(500));
    }

    private static void StopBroadcasting()
    {
        Console.WriteLine("⏸️  Stopped broadcasting");
        _broadcastTimer?.Dispose();
        _broadcastTimer = null;
    }

    // Client can request full sensor data if neededa
    public async Task RequestFullSensors()
    {
        try
        {
            var sensors = HWHash.GetOrderedList(); // Full version
            await Clients.Caller.SendAsync("FullSensorUpdate", sensors);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️  Error sending full sensors: {ex.Message}");
        }
    }

    // Client can request relevant sensors only
    public async Task RequestRelevantSensors()
    {
        try
        {
            var sensors = HWHash.GetRelevantList();
            await Clients.Caller.SendAsync("RelevantSensorUpdate", sensors);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️  Error sending relevant sensors: {ex.Message}");
        }
    }

    // Client can request only temperatures
    public async Task RequestTemperatures()
    {
        try
        {
            var allSensors = HWHash.GetOrderedList();
            var temps = allSensors.Where(s => s.ReadingType == "Temperature").ToList();
            await Clients.Caller.SendAsync("TemperatureUpdate", temps);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️  Error sending temps: {ex.Message}");
        }
    }
}