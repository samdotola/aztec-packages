# P2P Bootstrap

This package provides an implementation of a 'Bootstrap' P2P node. It's purpose is to assist new network participants in acquiring peers.

To build the package simply type `yarn build`, to start the boot node, simply type `yarn start`.

The node will require a number of environment variables:

P2P_IP - The IP address on which to listen for connections.
P2P_PORT - The port on which to listen for connections.
PEER_ID_PRIVATE_KEY - The private key to be used by the peer for secure communications with other peers. This key will also be used to derive the Peer ID.
