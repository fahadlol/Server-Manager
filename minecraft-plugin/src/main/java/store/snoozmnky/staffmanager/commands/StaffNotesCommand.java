package store.snoozmnky.staffmanager.commands;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import store.snoozmnky.staffmanager.StaffManager;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

public class StaffNotesCommand implements CommandExecutor {

    private final StaffManager plugin;
    private final HttpClient httpClient;
    private static final String BASE_URL = "https://ais-dev-j2co4irlbzd5vm65aqxnz7-751732837912.europe-west2.run.app";

    public StaffNotesCommand(StaffManager plugin) {
        this.plugin = plugin;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length < 1) {
            sender.sendMessage(ChatColor.RED + "Usage: /staffnotes <player> [add <note...>]");
            return true;
        }

        String targetPlayer = args[0];

        if (args.length >= 3 && args[1].equalsIgnoreCase("add")) {
            // Add a new note
            StringBuilder noteBuilder = new StringBuilder();
            for (int i = 2; i < args.length; i++) {
                noteBuilder.append(args[i]).append(" ");
            }
            String note = noteBuilder.toString().trim();
            addNote(sender, targetPlayer, note);
        } else {
            // Fetch notes
            fetchNotes(sender, targetPlayer);
        }

        return true;
    }

    private void fetchNotes(CommandSender sender, String targetPlayer) {
        String apiUrl = BASE_URL + "/api/minecraft/notes/" + targetPlayer;
        String apiKey = plugin.getConfig().getString("api-key");

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("x-api-key", apiKey)
                .GET()
                .build();

        sender.sendMessage(ChatColor.YELLOW + "Fetching notes for " + targetPlayer + "...");

        httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenAccept(response -> {
                    if (response.statusCode() == 200) {
                        JsonArray notes = JsonParser.parseString(response.body()).getAsJsonArray();
                        if (notes.size() == 0) {
                            sender.sendMessage(ChatColor.GRAY + "No notes found for " + targetPlayer + ".");
                        } else {
                            sender.sendMessage(ChatColor.GOLD + "--- Staff Notes for " + targetPlayer + " ---");
                            for (JsonElement element : notes) {
                                JsonObject note = element.getAsJsonObject();
                                String author = note.get("authorName").getAsString();
                                String content = note.get("content").getAsString();
                                sender.sendMessage(ChatColor.GRAY + "[" + ChatColor.WHITE + author + ChatColor.GRAY + "] " + ChatColor.WHITE + content);
                            }
                        }
                    } else if (response.statusCode() == 404) {
                        sender.sendMessage(ChatColor.RED + "Player not found in the Staff Manager database.");
                    } else {
                        sender.sendMessage(ChatColor.RED + "Failed to fetch notes. Status: " + response.statusCode());
                    }
                })
                .exceptionally(ex -> {
                    sender.sendMessage(ChatColor.RED + "Error connecting to the API: " + ex.getMessage());
                    return null;
                });
    }

    private void addNote(CommandSender sender, String targetPlayer, String noteContent) {
        String apiUrl = BASE_URL + "/api/minecraft/notes";
        String apiKey = plugin.getConfig().getString("api-key");
        String authorName = (sender instanceof Player) ? sender.getName() : "Console";

        JsonObject json = new JsonObject();
        json.addProperty("targetUsername", targetPlayer);
        json.addProperty("authorName", authorName);
        json.addProperty("content", noteContent);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("x-api-key", apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.toString()))
                .build();

        sender.sendMessage(ChatColor.YELLOW + "Adding note for " + targetPlayer + "...");

        httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenAccept(response -> {
                    if (response.statusCode() == 200) {
                        sender.sendMessage(ChatColor.GREEN + "Successfully added note for " + targetPlayer + ".");
                    } else if (response.statusCode() == 404) {
                        sender.sendMessage(ChatColor.RED + "Target player not found in the Staff Manager database.");
                    } else {
                        sender.sendMessage(ChatColor.RED + "Failed to add note. Status: " + response.statusCode());
                    }
                })
                .exceptionally(ex -> {
                    sender.sendMessage(ChatColor.RED + "Error connecting to the API: " + ex.getMessage());
                    return null;
                });
    }
}
