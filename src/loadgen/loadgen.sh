#!/bin/bash

while true; do
    for i in {1..1000}
    do
        HOST=frontend
        MESSAGE=$(fortune | tr -d '\n')
        echo "Load generator: posting to $HOST message: $MESSAGE"
        curl --data-urlencode "message=$MESSAGE" -X POST http://$HOST/message
        sleep $(( ( RANDOM % 10 )  + 1 ))
    done
done
