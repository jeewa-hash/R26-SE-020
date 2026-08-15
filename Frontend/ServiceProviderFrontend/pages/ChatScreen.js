import React, { useState } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ChatScreen({ route }) {
  // Safety: If params are missing, default to "Customer"
  const { customer } = route?.params || { customer: 'Customer' };
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! Are you available?', sender: 'them' },
  ]);

  const sendMessage = () => {
    if (inputText.trim()) {
      setMessages([...messages, { id: Date.now().toString(), text: inputText, sender: 'me' }]);
      setInputText('');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.chatHeader}>
        <Avatar.Text 
          size={40} 
          label={customer ? customer.charAt(0) : 'C'} 
          style={{ backgroundColor: '#7C3AED' }} 
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.userName}>{customer}</Text>
          <Text style={styles.userStatus}>Online</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {messages.map((item) => (
          <View key={item.id} style={[styles.bubble, item.sender === 'me' ? styles.myBubble : styles.theirBubble]}>
            <Text style={item.sender === 'me' ? styles.myText : styles.theirText}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Modern Input with Plus Icon */}
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.plusIcon}>
          <MaterialCommunityIcons name="plus" size={24} color="#7C3AED" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
        />
        <IconButton icon="send" iconColor="#7C3AED" size={28} onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', marginBottom: 80 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: 55, backgroundColor: '#FFF', elevation: 2 },
  userName: { fontWeight: '700', fontSize: 16 },
  userStatus: { fontSize: 12, color: '#10B981' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#7C3AED', borderBottomRightRadius: 2 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#E5E7EB', borderBottomLeftRadius: 2 },
  myText: { color: '#FFF' },
  theirText: { color: '#1F2937' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  plusIcon: { paddingHorizontal: 10 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 25, paddingHorizontal: 20, height: 45 },
});