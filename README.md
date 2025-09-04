# 🛒 ZoomCart Shop - Backend

This is the **backend server** for the ZoomCart e-commerce platform, built with **Node.js**, **Express**, **MongoDB**, and **Firebase Authentication**.  
It provides secure APIs for user authentication, product management, cart, and order functionalities.  

---

## 🚀 Features
- 🔑 Firebase Authentication (JWT verification middleware)  
- 👤 User Registration & Role-based Access (Admin/User)  
- 🛍️ Product Management (CRUD for Admins)  
- 🛒 Cart Management (Add / Get / Delete items)  
- 📦 Order Management (Users can place orders, Admins can manage orders)  
- 📧 Contact Form with **Nodemailer**  
- 🔐 Middleware for `verifyToken`, `verifyTokenEmail`, and `verifyAdmin`  
- 📂 MongoDB Collections:
  - `users`
  - `products`
  - `carts`
  - `orders`

---

## 🛠️ Tech Stack
- **Node.js** + **Express**
- **MongoDB** (Native driver)
- **Firebase Admin SDK** (Auth verification)
- **bcrypt** (Password hashing)
- **Nodemailer** (Contact form emails)
- **dotenv** (Environment variables)

---

## 📦 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/zoomcart-backend.git
cd zoomcart-backend
npm install
PORT=5000
MONGO_URI=your-mongodb-uri

# Nodemailer Gmail Config
ZOOMCART_EMAIL=your-email@gmail.com
ZOOMCART_EMAIL_PASS=your-app-password

npm run dev
###🛍️ Products
| Method   | Endpoint              | Description                   |
| -------- | --------------------- | ----------------------------- |
| `POST`   | `/api/products`       | Add product (Admin only)      |
| `GET`    | `/products`           | Get all products              |
| `GET`    | `/products/:id`       | Get single product            |
| `GET`    | `/all-product`        | Get all products (Admin only) |
| `PATCH`  | `/product/update/:id` | Update product (Admin only)   |
| `DELETE` | `/product/delete/:id` | Delete product (Admin only)   |
###🛒 Cart
| Method   | Endpoint       | Description             |
| -------- | -------------- | ----------------------- |
| `POST`   | `/cart`        | Add to cart             |
| `GET`    | `/cart/:email` | Get cart items by email |
| `DELETE` | `/cart/:id`    | Delete cart item        |

###Orders
| Method   | Endpoint              | Description                 |
| -------- | --------------------- | --------------------------- |
| `POST`   | `/order`              | Place order                 |
| `GET`    | `/users/order/:email` | Get user orders             |
| `GET`    | `/all-oders`          | Get all orders (Admin only) |
| `PATCH`  | `/order/accept/:id`   | Accept order (Admin only)   |
| `DELETE` | `/order/delete/:id`   | Delete order (Admin only)   |

###🏠 Home Page Data
| Method | Endpoint             | Description              |
| ------ | -------------------- | ------------------------ |
| `GET`  | `/categories`        | Get categories (limited) |
| `GET`  | `/discount-products` | Get discounted products  |

###📧 Contact
| Method | Endpoint   | Description                   |
| ------ | ---------- | ----------------------------- |
| `POST` | `/contact` | Send message via contact form |

##🔐 Middleware

verifyFirebaseToken → Checks Firebase JWT

verifyTokenEmail → Ensures email from token matches params

verifyAdmin → Ensures the user is admin

##📡 Deployment
 You can deploy this backend on:
 .Vercel

