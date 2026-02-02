# Real-Time Location Tracking Architecture Research

## The Problem

Unolo wants to track field employees locations in real-time and show them on a managers dashboard. Instead of manual check-ins, employees phones should continuously send their GPS coordinates to the backend, and managers should see all employee locations update live on their screens.

Heres what we need to handle:
- 10,000+ field employees sending location updates every 30 seconds
- Mobile devices with limited battery life
- Flaky mobile networks in the field
- Startup budget constraints
- Small engineering team

## Technology Comparison

I looked at several approaches for real-time communication. Heres what i found:

### WebSockets

WebSockets create a persistent, full-duplex connection between the client and server. Once established, both sides can send data anytime without the overhead of HTTP headers.

Pros:
- Very low latency once connected
- Two-way communication is built-in
- Well-supported across all browsers and platforms

Cons:
- Connection can drop on mobile networks and needs reconnection logic
- Server needs to maintain state for all open connections
- Scales poorly without a message broker like Redis

When to use: Chat apps, collaborative tools, games. Good for real-time dashboards but battery intensive on mobile.

### Server-Sent Events (SSE)

SSE lets the server push data to the client over a single HTTP connection. Its one-way only - server to client.

Pros:
- Simpler than WebSockets, uses regular HTTP
- Automatic reconnection built into browsers
- Works over HTTP/2 for better performance

Cons:
- One-way only - client cant send data through the same connection
- Some browsers limit max connections (though HTTP/2 helps)
- Not ideal for bi-directional communication

When to use: Live feeds, notifications, one-way data streams. Good for sending location from server to dashboard, but employees would need a separate connection to send their location.

### MQTT

MQTT is a lightweight messaging protocol designed for IoT and mobile devices. It uses a publish-subscribe model with a central broker.

Pros:
- Extremely lightweight, designed for low bandwidth
- Three Quality of Service levels for different reliability needs
- Last Will and Testament feature - broker can notify others if a client disconnects unexpectedly
- Works great on unreliable networks with automatic reconnection
- Very battery efficient

Cons:
- Requires setting up and maintaining a broker (like Mosquitto or EMQX)
- Web browsers dont support MQTT natively - need a WebSocket bridge
- More moving parts to manage

When to use: IoT devices, sensor networks, mobile apps. Perfect for our use case with thousands of employees sending location updates.

### Third-Party Services (Firebase, Pusher, Ably)

These services handle the real-time infrastructure for you. You just integrate their SDK and they manage the connections.

Pros:
- Quick to implement, no infrastructure to manage
- Handle scaling for you
- Features like presence, history, auth built-in

Cons:
- Can get expensive as usage grows
- Vendor lock-in
- Might be overkill for a startup with limited budget

When to use: When you want to ship fast and dont mind the ongoing cost. Good for MVPs but can become a significant expense.

### Long Polling

The client repeatedly asks the server "do you have anything new?" and the server holds the request until it has data to send.

Pros:
- Works everywhere, no special protocol needed
- Easy to understand and implement

Cons:
- Terrible for battery life on mobile
- High latency compared to other methods
- Server gets hammered with connection requests

When to use: Legacy systems or environments where WebSockets are blocked. Not recommended for new development.

## My Recommendation: MQTT

For Unolos use case, i recommend using MQTT with a WebSocket bridge for the frontend.

Heres why:

First, battery life. Employees are in the field all day and their phones need to last. MQTT was literally designed for this - its the protocol used in most IoT devices because its so efficient. The overhead is tiny compared to HTTP or WebSockets.

Second, scale. 10,000 employees sending updates every 30 seconds is a lot of messages. MQTT brokers are built to handle millions of connections and messages. A WebSocket server would struggle with this without significant infrastructure work.

Third, reliability on flaky networks. Field employees might have spotty cellular coverage. MQTT has QoS levels that guarantee message delivery even if the connection drops temporarily. The broker will hold messages until the employee comes back online.

Fourth, cost. Running your own MQTT broker is cheap - you can spin up a small server on DigitalOcean or AWS for like $10-20/month. Compare that to Firebase or Pusher which would charge by the message.

## Trade-offs

Im sacrificing some developer convenience and simplicity. Setting up an MQTT broker adds infrastructure to manage. WebSockets would be easier to implement initially but would require more work to scale and handle mobile network issues.

If the team was larger and we had a dedicated DevOps person, i might reconsider. Also, if we needed bidirectional communication (managers sending commands to employees phones), wed need to add WebSocket support anyway.

At 100,000+ employees, wed need to look into MQTT clustering and possibly a message queue like RabbitMQ in front of the MQTT broker to handle the load.

## Implementation Outline

Backend changes:
- Set up an MQTT broker like EMQX or Mosquitto
- Create topics like unolo/employees/{employee_id}/location
- Use a WebSocket bridge so the frontend dashboard can subscribe via WebSocket
- Store latest location in Redis for quick access

Frontend/mobile changes:
- Employee app uses MQTT library to publish location to their topic every 30 seconds
- Manager dashboard subscribes to topic pattern unolo/employees/+/location to get all updates
- Use QoS level 1 for at-least-once delivery

Infrastructure:
- One MQTT broker server (can start small, scale up as needed)
- Redis for caching latest locations
- Everything can run in Docker containers

This approach gives us a scalable, battery-efficient solution that handles the realities of field work.
