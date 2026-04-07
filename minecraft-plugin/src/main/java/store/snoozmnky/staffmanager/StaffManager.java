package store.snoozmnky.staffmanager;

import org.bukkit.plugin.java.JavaPlugin;
import store.snoozmnky.staffmanager.commands.StaffNotesCommand;

public class StaffManager extends JavaPlugin {

    @Override
    public void onEnable() {
        // Save default config if not exists
        saveDefaultConfig();

        // Register commands
        getCommand("staffnotes").setExecutor(new StaffNotesCommand(this));

        getLogger().info("StaffManager has been enabled!");
    }

    @Override
    public void onDisable() {
        getLogger().info("StaffManager has been disabled!");
    }
}
