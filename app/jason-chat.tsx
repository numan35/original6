// project/app/jason-chat.tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, ScrollView, ActivityIndicator } from "react-native";
import { getUserLocation } from "@/lib/location"; // uses your existing location.ts
import callJasonBrain from "@/lib/jasonBrain"; // your existing client
import type { Message } from "@/lib/types"; // if you don't have this, inline the type below

// If you don't have a shared Message type, uncomment this:
// type Message = { role: "user" | "assistant" | "system" | "tool"; content: string; name?: string };

export default function JasonChat() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Ask once on mount and cache coordinates
    (async () => {
      try {
        const loc = await getUserLocation(); // expected to return { lat, lng } or null
        if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
          setCoords({ lat: loc.lat, lng: loc.lng });
        }
      } catch {}
    })();
  }, []);

  async function send() {
    const content = input.trim();
    if (!content) return;
    const userMsg: Message = { role: "user", content };
    const msgs = [...conversation, userMsg];
    setConversation(msgs);
    setInput("");
    setLoading(true);

    try {
      // Attach geo if available
      const slots: Record<string, any> = {};
      if (coords) {
        slots.lat = coords.lat;
        slots.lng = coords.lng;
      }

      const resp = await callJasonBrain(msgs, slots);
      const assistantMsg: Message = resp?.message ?? { role: "assistant", content: "…" };
      setConversation([...msgs, assistantMsg]);
    } catch (e: any) {
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e?.message || String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <ScrollView style={{ flex: 1 }}>
        {conversation.map((m, i) => (
          <Text key={i} style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: "bold" }}>{m.role === "user" ? "You: " : "Jason: "}</Text>
            {m.content}
          </Text>
        ))}
        {loading && <ActivityIndicator />}
        {!coords && (
          <Text style={{ color: "#666", marginBottom: 8 }}>
            Tip: allow location to bias results near you.
          </Text>
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={{ flex: 1, borderWidth: 1, padding: 8, borderRadius: 8 }}
          placeholder="Ask Jason…"
        />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}
