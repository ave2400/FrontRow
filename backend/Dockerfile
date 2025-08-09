# Use official Node image
FROM node:18

# Set working directory
WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose your app port (match your app)
EXPOSE 5000

# Start the app
CMD ["node", "index.js"]
