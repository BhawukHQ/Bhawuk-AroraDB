package cluster

import (
	"io"
	"net"
	"os"
	"time"

	"github.com/hashicorp/raft"
)

// AroraFSM implements the raft.FSM interface.
type AroraFSM struct {
	// Add application specific state here.
}

// Apply applies a Raft log entry to the state machine.
func (f *AroraFSM) Apply(l *raft.Log) interface{} {
	// Implement state machine application logic here.
	return nil
}

// Snapshot returns a snapshot of the current state of the FSM.
func (f *AroraFSM) Snapshot() (raft.FSMSnapshot, error) {
	return &aroraSnapshot{}, nil
}

// Restore restores the state machine from a snapshot.
func (f *AroraFSM) Restore(rc io.ReadCloser) error {
	defer rc.Close()
	// Implement restore logic from snapshot.
	return nil
}

// aroraSnapshot implements the raft.FSMSnapshot interface.
type aroraSnapshot struct{}

// Persist saves the snapshot to the given sink.
func (s *aroraSnapshot) Persist(sink raft.SnapshotSink) error {
	defer sink.Close()
	// Write state to sink here.
	return nil
}

// Release releases the snapshot.
func (s *aroraSnapshot) Release() {}

// SetupRaft initializes a new Raft node.
func SetupRaft(localID, bindAddr, raftDir string) (*raft.Raft, error) {
	config := raft.DefaultConfig()
	config.LocalID = raft.ServerID(localID)

	addr, err := net.ResolveTCPAddr("tcp", bindAddr)
	if err != nil {
		return nil, err
	}
	transport, err := raft.NewTCPTransport(bindAddr, addr, 3, 10*time.Second, os.Stderr)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(raftDir, 0700); err != nil {
		return nil, err
	}

	snapshots, err := raft.NewFileSnapshotStore(raftDir, 2, os.Stderr)
	if err != nil {
		return nil, err
	}

	logStore := raft.NewInmemStore()
	stableStore := raft.NewInmemStore()

	fsm := &AroraFSM{}

	raftNode, err := raft.NewRaft(config, fsm, logStore, stableStore, snapshots, transport)
	if err != nil {
		return nil, err
	}

	configuration := raft.Configuration{
		Servers: []raft.Server{
			{
				ID:      config.LocalID,
				Address: transport.LocalAddr(),
			},
		},
	}
	raftNode.BootstrapCluster(configuration)

	return raftNode, nil
}
