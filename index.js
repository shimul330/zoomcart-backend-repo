const express = require('express')
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const port = process.env.PORT || 3000;



//Midddleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2oafbzi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//firebase admin initilaize
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//verifyToken middleware by firebase access token
const verifyFirBaseToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.decoded = decoded;
        next();
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
};

//verifyTokenEmail middleware
const verifyTokenEmail = (req, res, next) => {
    const paramEmail = req.params.email;
    const decodedEmail = req.decoded?.email;

    if (!decodedEmail) {
        return res.status(401).send({ message: "Unauthorized: No decoded email found" });
    }

    if (paramEmail !== decodedEmail) {
        return res.status(403).send({ message: "Forbidden: Email mismatch" });
    }

    next();
}

async function run() {
    try {
        await client.connect();
        const db = client.db('zoomCartDB');

        const usersCollection = db.collection('users');
        const productsCollection = db.collection('products');
        const cartCollection = db.collection('carts');
        const odersCollection = db.collection('oders');


        //verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const quary = { email };
            const user = await usersCollection.findOne(quary);

            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbeden acess' })
            }
            next();
        }

        // users post route
        app.post('/users', async (req, res) => {
            try {
                const { email, password, ...rest } = req.body;

                // check required fields
                if (!email || !password) {
                    return res.status(400).send({ message: 'Email and password are required' });
                }

                // Check if user already exists
                const userExists = await usersCollection.findOne({ email });
                if (userExists) {
                    return res.status(200).send({ message: 'User already exists', inserted: false });
                }

                // Hash password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Create user object with hashed password
                const user = { ...rest, email, password: hashedPassword };

                // Insert into database
                const result = await usersCollection.insertOne(user);

                res.status(201).send({
                    message: 'User created successfully',
                    inserted: true,
                    userId: result.insertedId
                });

            } catch (error) {
                console.error("❌ User insert error:", error);
                res.status(500).send({ message: 'Server error', error: error.message });
            }
        });

        // Admin Add Products Route
        app.post('/api/products', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            try {
                const product = req.body;

                // validation
                if (!product.name || !product.price) {
                    return res.status(400).send({ message: 'Name and Price are required' });
                }

                // insert product into MongoDB
                const result = await productsCollection.insertOne(product);

                res.status(201).send({
                    success: true,
                    message: '✅ Product added successfully',
                    productId: result.insertedId
                });
            } catch (error) {
                console.error("❌ Product insert error:", error);
                res.status(500).send({ message: 'Server error', error: error.message });
            }
        });

        //get all products
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        })

        //get product single details
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(quary);
            res.send(result);
        })

        //Cart data post
        app.post('/cart', verifyFirBaseToken, async (req, res) => {
            const item = req.body;

            const exists = await cartCollection.findOne({ name: item.name, email: item.email });
            if (exists) return res.send({ message: "Already in cart" });

            const result = await cartCollection.insertOne(item);
            res.send(result);
        });

        //cart data get
        app.get("/cart/:email", verifyFirBaseToken, verifyTokenEmail, async (req, res) => {
            const paramEmail = req.params.email;

            // if (paramEmail !== req.decoded.email) {
            //     return res.status(403).send({ message: "Forbidden: Email mismatch" });
            // }

            const result = await cartCollection.find({ email: paramEmail }).toArray();
            res.send(result);
        });

        //cart data delete
        app.delete("/cart/:id", verifyFirBaseToken, async (req, res) => {
            const id = req.params.id;


            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid ID format" });
            }

            const query = { _id: new ObjectId(id) };


            try {
                const result = await cartCollection.deleteOne(query);

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Item not found" });
                }

                res.send({ message: "Deleted successfully", result });
            } catch (err) {

                res.status(500).send({ message: "Server error", error: err.message });
            }
        });

        app.get('/users/role/:email', verifyFirBaseToken, async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            if (!result) return res.status(404).send({ message: 'User Not Found' })
            res.send({ role: result?.role })
        }) //gt a user's role


        //get all user for admin role
        app.get('/all-user', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        //user role update
        app.patch('/user/role/update/:email', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const { role } = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role,
                    status: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //user delete
        app.delete('/user/delete/:id', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result)

        })

        //manage product get data
        app.get('/all-product', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        })

        //single product delete by admin
        app.delete('/product/delete/:id', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result)

        })

        // product update  rote by admin
        app.patch('/product/update/:id', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = { $set: updatedData };

                const result = await productsCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: "Product updated successfully" });
                } else {
                    res.status(404).send({ success: false, message: "Product not found or no changes made" });
                }
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        //order data post
        app.post('/order', verifyFirBaseToken, async (req, res) => {
            const orderData = req.body;

            const existingOrder = await odersCollection.findOne({
                user: orderData.user,
                productId: orderData.productId
            });

            if (existingOrder) {
                return res.status(400).send({ message: "This product is already ordered!" });
            }

            const result = await odersCollection.insertOne(orderData);
            res.send(result)
        })

        // GET user orders by email
        app.get('/users/order/:email', verifyFirBaseToken, verifyTokenEmail, async (req, res) => {
            const email = req.params.email;
            const result = await odersCollection.find({ user: email }).toArray();
            if (!result || result.length === 0) return res.status(404).send({ message: 'No orders found' });
            res.send(result);
        });

        //GET user all data by admin oderManage
        app.get('/all-oders', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            try {
                const result = await odersCollection.find().toArray();
                if (!result || result.length === 0) {
                    return res.status(404).send({ message: 'No orders found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Something went wrong while fetching orders" });
            }
        });

        //DELETE User order data by admin
        app.delete('/order/delete/:id', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await odersCollection.deleteOne(filter);
            res.send(result)
        })

        // update order status by admin
        app.patch('/order/accept/:id', verifyFirBaseToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            try {
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: { status: "Completed" }
                };
                const result = await odersCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: "Order not found or already completed" });
                }
                res.send({ message: "Order accepted successfully" });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Something went wrong" });
            }
        });

        //home page GET catagory data
        app.get('/categories', async (req, res) => {
            try {
                const categories = await productsCollection.aggregate([
                    {
                        $group: {
                            _id: "$category",
                            product: { $first: "$$ROOT" }
                        }
                    },
                    { $limit: 4 }
                ]).toArray();

                if (!categories || categories.length === 0) {
                    return res.status(404).send({ message: "No categories found" });
                }

                const formatted = categories.map(item => ({
                    _id: item.product._id,
                    category: item._id,
                    name: item.product.name,
                    images: item.product.photos || [],
                    price: item.product.price
                }));

                res.send(formatted);

            } catch (error) {
                console.error(" Category fetch error:", error);
                res.status(500).send({ message: "Server error while fetching categories" });
            }
        });

        //home page GET discount product data
        app.get('/discount-products', async (req, res) => {
            const discounted = await productsCollection.find({ discount: { $gt: 0 } }).toArray();
            res.send(discounted);
        });

        //contact route by nodemailer
        app.post("/contact", async (req, res) => {

            const { fullName, email, message } = req.body;


            if (!fullName || !email || !message) {
                return res.status(400).json({ success: false, error: "All fields are required" });
            }

            try {
                // Nodemailer transporter
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.ZOOMCART_EMAIL,
                        pass: process.env.ZOOMCART_EMAIL_PASS
                    }
                });

                // Email content
                await transporter.sendMail({
                    from: process.env.ZOOMCART_EMAIL,
                    to: process.env.ZOOMCART_EMAIL,
                    replyTo: email,
                    subject: `New Contact Form Submission from ${fullName}`,
                    text: `Name: ${fullName}\nEmail: ${email}\nMessage: ${message}`
                });

                res.json({ success: true, message: "Message sent successfully!" });
            } catch (error) {
                console.error(error);
                res.status(500).json({ success: false, error: "Failed to send message" });
            }
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);



//test get route
app.get('/', (req, res) => {
    res.send('Hello ZoomCart shop!')
})

//test listen port
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
