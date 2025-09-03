
# 🖼️ Asynchronous Image Processing Service with Notifications  

A distributed **MERN stack microservices project** designed to handle **asynchronous image processing** (resize, watermark, etc.) and deliver **real-time notifications**.  
This project demonstrates enterprise-grade practices with **Docker, Kubernetes, RabbitMQ, CI/CD pipelines, and robust testing strategies**.  

---

## 📌 Project Overview  

### 🎯 Goal  
To build a system where users can upload images, have them **processed asynchronously**, and receive **notifications** on completion or failure.  

### ✨ Key Features  
- 📤 User-friendly interface for image uploads & status tracking  
- ⚡ Asynchronous image processing with dedicated microservices  
- 🔔 Real-time user notifications (success/failure)  
- 📨 Message queueing via RabbitMQ for reliable communication  
- 🐳 Full containerization with Docker & orchestration via Kubernetes  
- 🚀 Automated CI/CD with GitHub Actions  
- ✅ Comprehensive testing strategy (Unit, Integration, E2E)  

---

## 🏗️ Architecture  

```mermaid
graph TD
    User --> Frontend(React Frontend)
    Frontend --HTTP/REST--> ImageUploadService(1. ImageUpload Service)
    ImageUploadService --API Calls--> MongoDB
    ImageUploadService --Publishes 'Image Ready'--> RabbitMQ(RabbitMQ Broker)
    RabbitMQ --Consumes 'Image Ready'--> ImageProcessorService(2. ImageProcessor Service)
    ImageProcessorService --Updates--> MongoDB
    ImageProcessorService --Publishes 'Status Update'--> RabbitMQ
    RabbitMQ --Consumes 'Status Update'--> NotificationService(3. Notification Service)
    NotificationService --HTTP/REST--> Frontend
````

### 🧩 Microservices

1. **Frontend (React.js)** → Upload, track, and view notifications
2. **ImageUpload Service (Node.js/Express)** → Stores metadata, initiates processing via RabbitMQ
3. **ImageProcessor Service (Node.js/Express + Sharp)** → Handles transformations, updates DB, publishes results
4. **Notification Service (Node.js/Express)** → Consumes status updates, exposes notifications to frontend

### 🗄️ Shared Components

* **MongoDB** → Stores image metadata
* **RabbitMQ** → Broker for decoupled inter-service communication
* **Shared Storage Volume** → Stores original & processed images

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Axios
* **Backend & Microservices:** Node.js, Express.js, Multer, Mongoose, Sharp, amqplib
* **Database:** MongoDB
* **Queue:** RabbitMQ
* **Containerization:** Docker, Docker Compose
* **Orchestration:** Kubernetes (Minikube/Kind for local, scalable for cloud)
* **CI/CD:** GitHub Actions
* **Testing:** Jest, React Testing Library, Supertest, Cypress/Playwright

---

## 🧪 Testing Strategy

A **multi-layered testing approach** ensures reliability and quality:

### 🔹 Unit Testing

* **Frontend (React):** Jest, React Testing Library → component rendering, state updates, user interactions
* **Backend (Node.js Services):** Jest/Mocha → API handlers, RabbitMQ publishing logic, DB mocks

### 🔹 Integration Testing

* Verify service-to-service interactions with **real MongoDB & RabbitMQ instances**
* Example: Upload image → check metadata in MongoDB → verify message in RabbitMQ

### 🔹 End-to-End (E2E) Testing

* Tools: Cypress / Playwright
* Full workflow validation:

  1. Upload → Pending → Processed/Failed → Notification in UI

### 🔹 CI/CD Integration

* **Unit tests** run on every push (fast feedback)
* **Integration tests** run in CI with test containers (MongoDB, RabbitMQ)
* **E2E tests** run on staging before production deployment

---

## ⚙️ CI/CD Pipeline (GitHub Actions)

* 🛠️ Build & test all microservices
* 🐳 Build Docker images & push to Docker Hub
* 🔄 Spin up test environment with Docker Compose for integration/E2E tests
* ☸️ Deploy to Kubernetes after all tests pass

👉 Full pipeline YAML is in [`/.github/workflows/ci-cd.yml`](./.github/workflows/ci-cd.yml)

---

## ☸️ Kubernetes Deployment

* **Deployments** for each service (`frontend`, `image-upload`, `image-processor`, `notification`, `mongodb`, `rabbitmq`)
* **Services** (ClusterIP / NodePort / LoadBalancer) for communication
* **Persistent Volumes & Claims** for MongoDB and shared image storage
* **Horizontal Pod Autoscaler (HPA)** for scaling `ImageProcessor`
* **ConfigMaps & Secrets** for sensitive configs
---
