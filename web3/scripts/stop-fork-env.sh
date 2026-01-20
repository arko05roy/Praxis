#!/bin/bash

echo "Stopping PRAXIS fork environment..."

if [ -f /tmp/praxis/anvil.pid ]; then
    PID=$(cat /tmp/praxis/anvil.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✓ Stopped Anvil (PID: $PID)"
    else
        echo "⚠ Anvil process not running"
    fi
    rm /tmp/praxis/anvil.pid
else
    # Try to find and kill any Anvil on port 8546
    if lsof -i :8546 > /dev/null 2>&1; then
        kill $(lsof -t -i :8546) 2>/dev/null
        echo "✓ Stopped process on port 8546"
    else
        echo "⚠ No Anvil process found"
    fi
fi

echo "Done."
