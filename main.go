package main

import (
    "fmt"
	"strings"
	"strconv"
	"net/http"
	server "github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"
	"context"
	"github.com/valkey-io/valkey-go"
)

const TOTAL_CHECKBOXES = 100
var STATES_STRING = strings.Repeat("0", TOTAL_CHECKBOXES) 
var STATES_ARRAY [TOTAL_CHECKBOXES]int 

func toggleBit(index int) {
	STATES_ARRAY[index] = 1 - STATES_ARRAY[index]
}

func saveStatesToRedis(ctx context.Context,client valkey.Client, statesString string) {
	err := client.Do(ctx, client.B().Set().Key("states").Value(statesString).Build()).Error()
	if err != nil {
		panic(err)
	}
}

func statesArrayToString(statesArray []int) string {
	return strings.Trim(strings.Join(strings.Split(fmt.Sprint(statesArray), " "), ""), "[]")
}

func initRedis() (context.Context, valkey.Client) {
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{"127.0.0.1:6379"}})
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	err = client.Do(ctx, client.B().Set().Key("states").Value(STATES_STRING).Nx().Build()).Error()
	result, err := client.Do(ctx, client.B().Get().Key("states").Build()).ToString()

	for idx, bit_str := range(result) {
		bit, _ := strconv.Atoi(string(bit_str))
		STATES_ARRAY[idx] = bit
	}

	return ctx, client
}

func main() {
	ctx, client := initRedis()
	defer client.Close()

	config := server.DefaultServerOptions()
	config.SetCors(&types.Cors{Origin: "*"})
	io := server.NewServer(nil, config)
	io.On("connection", func(args ...any) {
		socket := args[0].(*server.Socket)
		socket.On("toggle_bit", func(args ...any) {
			index, _ := strconv.Atoi(args[0].(string))
			toggleBit(index)
			statesString := statesArrayToString(STATES_ARRAY[:])
			// fmt.Printf("STATES STRING AFTER TOGGLE %s\n", statesString)
			saveStatesToRedis(ctx, client, statesString)
			io.Emit("states", statesString)
		})
		
		socket.On("get_states", func(args ...any) {
			// fmt.Println("RECEIVED GET STATES")
			states := statesArrayToString(STATES_ARRAY[:])
			// fmt.Printf("STATES: %s\n", states)
			ack := args[1].(server.Ack)
			ack([]any{states}, nil)
		})

		socket.On("disconnect", func(args ...any) {
			fmt.Printf("disconnected: %s\n", socket.Id())
		})
	})

	http.Handle("/socket.io/", io.ServeHandler(nil))
	http.ListenAndServe("0.0.0.0:42069", nil)
}



