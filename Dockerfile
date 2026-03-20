FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Expose web panel port
EXPOSE 3000

# Start bot
CMD ["node", "index.js"]
