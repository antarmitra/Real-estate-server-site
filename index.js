const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleWare
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.orneeg0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const propertyCollection = client.db('estateDb').collection('advertisement')
        const propertyAddCollection = client.db('estateDb').collection('addProperty')
        const reviewCollection = client.db('estateDb').collection('review')
        const userCollection = client.db('estateDb').collection('users')
        const agentAddCollection = client.db('estateDb').collection('add')



        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token })
        })

        // middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after the verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }


        // advertisement 
        // app.get('/advertisement', async (req, res) => {
        //     const result = await propertyCollection.find().toArray();
        //     res.send(result)
        // })


        // Add Property
        app.get('/addProperty', async (req, res) => {
            const result = await propertyAddCollection.find().toArray();
            res.send(result)
        })


        app.get('/addProperty/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await propertyAddCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/addProperty', async (req, res) => {
            const add = req.body;
            const result = await propertyAddCollection.insertOne(add);
            res.send(result)
        })

        app.delete('/addProperty/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await propertyAddCollection.deleteOne(query);
            res.send(result)
        })


        // review 
        app.get('/review', async (req, res) => {
            let sortItem = { date: -1 }
            const result = await reviewCollection.find().sort(sortItem).toArray();
            res.send(result)
        })

        app.get('/review/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await reviewCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        app.delete('/review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result)
        })




        // userssdsssssssssss
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })


        app.get('/users/agent/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let agent = false;
            if (user) {
                agent = user?.role === 'agent';
            }
            res.send({ agent });
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })


        app.patch('/users/agent/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'agent'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/users/fraud/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'fraud'
                }
            }
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })


        // agent add

        app.get('/add/property', async (req, res) => {
            const result = await agentAddCollection.find().toArray();
            res.send(result)
        })

        app.get('/add', async (req, res) => {
            try {
                const filter = req.query;
                console.log(filter);

                // Construct the query for title search
                const query = {
                    title: { $regex: filter.search, $options: 'i' }
                };

                // Construct options for sorting
                const options = {
                    sort: {
                        maxPrice: filter.sort === 'asc' ? 1 : -1
                    }
                };

                // Fetch data from MongoDB collection
                const result = await agentAddCollection.find(query, options).toArray();

                // Send the result to the client
                res.send(result);
            } catch (error) {
                console.error("Error fetching data:", error);
                res.status(500).send("Internal Server Error");
            }
        });


        app.post('/add', async (req, res) => {
            const add = req.body;
            const result = await agentAddCollection.insertOne(add);
            res.send(result)
        })

        app.patch('/add/verify/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'verify'
                }
            }
            const result = await agentAddCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/add/reject/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'reject'
                }
            }
            const result = await agentAddCollection.updateOne(filter, updateDoc);
            res.send(result)
        })


        app.patch('/add/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    image: item.image,
                    title: item.title,
                    name: item.name,
                    email: item.email,
                    maxPrice: item.maxPrice,
                    minPrice: item.minPrice,
                }
            }
            const result = await agentAddCollection.updateOne(filter, updateDoc)
            res.send(result);
        })

        app.delete('/add/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await agentAddCollection.deleteOne(query);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('realetate is setting')
})

app.listen(port, () => {
    console.log(`realestate is running on port ${port}`);
})