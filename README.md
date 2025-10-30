# Spookstr

👻 **Spookstr** is a decentralized social media platform built on Nostr, focused on paranormal, supernatural, and spooky content. Experience the thrill of the unknown in a community-driven, censorship-resistant environment.

## ✨ Features

### 🌐 Nostr-Powered Social Network
- **Decentralized Architecture**: Built on the Nostr protocol for true censorship resistance
- **User Ownership**: You own your data and identity - no central authority can take it down
- **Interoperability**: Connect with the broader Nostr ecosystem and other compatible clients

### 👥 Moderated Communities (NIP-72)
- **Community Creation**: Create and manage your own paranormal communities
- **Reddit-style Moderation**: Full moderation system with approval workflows
- **Community Posts**: Share content within specific paranormal interest groups
- **Hierarchical Discussions**: Nested comment threads for engaging conversations

### 🎵 Multimedia Content
- **Podcast Support**: Built-in podcast player with background playback
- **Media Sharing**: Upload and share images, videos, and audio files
- **Blossom Integration**: Decentralized file storage using Blossom servers
- **Rich Media Posts**: Embed various media types in your posts and comments

### 🔐 Privacy & Security
- **End-to-End Encryption**: Private messaging with NIP-44 encryption
- **Nostr Wallet Connect**: Lightning payments integration for zaps and tips
- **NSFW Filtering**: Optional content filtering for a safer browsing experience
- **Secure Authentication**: Nostr-native login with NIP-07 support

### 🎨 Modern User Experience
- **Dark Theme**: Eye-friendly dark mode optimized for late-night paranormal investigations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Live feed updates and instant notifications
- **Performance Optimized**: Smooth scrolling and fast loading times

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/spookstr.git
   cd spookstr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see Spookstr in action.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## 🛠️ Technology Stack

### Core Technologies
- **React 18**: Modern React with hooks and concurrent rendering
- **TypeScript**: Type-safe development experience
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework for styling

### Nostr Integration
- **Nostrify**: Comprehensive Nostr protocol framework
- **nostr-tools**: Nostr utilities and helpers
- **NIP-07 Support**: Browser extension integration
- **NIP-44**: End-to-end encryption
- **NIP-72**: Moderated communities

### UI Components
- **shadcn/ui**: Beautiful, accessible UI components
- **Radix UI**: Headless UI primitives
- **Lucide React**: Modern icon library
- **Tailwind Animate**: Smooth animations and transitions

### Data & State Management
- **TanStack Query**: Powerful data fetching and caching
- **React Hook Form**: Performant form handling
- **Zod**: Type-safe schema validation

### Additional Features
- **Emoji Picker**: Rich emoji support for posts and comments
- **QR Code Generation**: Easy profile sharing
- **Video/Audio Playback**: HLS.js and Dash.js integration
- **Image Gallery**: Embla Carousel for media viewing

## 📚 Key Concepts

### Communities
Spookstr implements **NIP-72 Moderated Communities**, allowing users to create and join specialized paranormal communities:

- **Community Creation**: Anyone can create a community around a paranormal topic
- **Moderation**: Community owners can appoint moderators to approve content
- **Content Approval**: Posts require moderator approval before being visible to regular users
- **Community Standards**: Each community can set its own rules and guidelines

### Content Types
- **Community Posts (Kind 1111)**: Posts within specific communities
- **Text Notes (Kind 1)**: General posts visible to all users
- **Replies (Kind 1111)**: Comments on posts and other replies
- **Media Posts**: Posts with attached images, videos, or audio files

### User Identity
- **Nostr Public Key**: Your unique identifier on the network
- **Profile Metadata**: Customizable profile with name, picture, and about section
- **NIP-05 Verification**: Verified identity with nostr addresses
- **Lightning Address**: Receive zaps and tips via Lightning Network

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_APP_NAME=Spookstr
VITE_APP_DESCRIPTION=A decentralized paranormal social network
VITE_DEFAULT_RELAY=wss://relay.primal.net
```

### Custom Relays
Spookstr supports multiple relays for optimal performance:

```typescript
const presetRelays = [
  { url: 'wss://spookstr2.nostr1.com', name: 'Spookstr2' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
];
```

### Bloom Servers
Configure your preferred Blossom servers for file storage:

```typescript
const blossomServers = [
  "https://blossom.primal.net",
  "https://cdn.satellite.earth",
];
```

## 🤝 Contributing

We welcome contributions from the paranormal community and Nostr enthusiasts! Here's how you can help:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use the existing component patterns
- Write tests for new features
- Update documentation as needed

### Areas for Contribution
- **UI/UX Improvements**: Enhance the user interface and experience
- **Performance Optimization**: Improve loading times and responsiveness
- **New Features**: Add exciting paranormal-themed features
- **Documentation**: Help improve docs and guides
- **Bug Fixes**: Squash those spooky bugs!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Nostr Protocol**: For providing the foundation of decentralized social networking
- **Nostrify**: For the excellent Nostr framework
- **shadcn/ui**: For the beautiful component library
- **The Paranormal Community**: For inspiring this unique platform

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Nostr**: Follow us on Nostr for updates and announcements
- **Discord**: Join our community server for discussions and support

---

**Built with ❤️ for the paranormal community on Nostr**

*"The truth is out there, and now it's decentralized."* - Spookstr Team