import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, ActivityIndicator } from 'react-native';
import { callJasonBrain } from '@/lib/jasonBrain';
import { assertConfig } from '@/lib/configGuard';

export default function JasonChat() {
  assertConfig();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await callJasonBrain([userMessage]);
      if (response.ok && response.message) {
        setMessages(prev => [...prev, {
          role: response.message!.role,
          content: response.message!.content || 'No response content'
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${response.error || 'Unknown error'}`
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to send message'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>
        Jason Chat
      </Text>
      
      <ScrollView style={{ flex: 1, marginBottom: 16 }}>
        {messages.map((message, index) => (
          <View key={index} style={{ 
            marginBottom: 12, 
            padding: 12, 
            backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
            borderRadius: 8 
          }}>
            <Text style={{ fontWeight: '600', marginBottom: 4 }}>
              {message.role === 'user' ? 'You' : 'Jason'}
            </Text>
            <Text>{message.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={{ padding: 12 }}>
            <ActivityIndicator />
            <Text style={{ textAlign: 'center', marginTop: 8 }}>
              Jason is thinking...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={{ 
            flex: 1, 
            borderWidth: 1, 
            borderColor: '#ccc', 
            padding: 12, 
            borderRadius: 8 
          }}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          multiline
          onSubmitEditing={sendMessage}
        />
        <Button 
          title={loading ? "..." : "Send"} 
          onPress={sendMessage}
          disabled={loading || !input.trim()}
        />
      </View>
    </View>
  );
}