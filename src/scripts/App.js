import styled from 'styled-components'
import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { io } from "socket.io-client";
import { Grid } from "react-window";
import { useWindowSize } from "react-use";

import BitSet from '../bitset';

const CHECKBOX_SIZE = 25;
const CHECKBOX_MARGIN = 10;
const TOTAL_CHECKBOX = 100;

const StyledCheckbox = styled.input`
  margin: ${CHECKBOX_MARGIN}px;
  padding: 0;
  width: ${CHECKBOX_SIZE}px;
  height: ${CHECKBOX_SIZE}px;
  box-shadow: none;
`;

const CheckBox = memo(({index, isChecked, onClick}) => {
    return (<StyledCheckbox 
                key={index}
                type='checkbox' 
                onChange={onClick}
                checked={isChecked}/>) 
})


const App = () => {
    const { width, height } = useWindowSize();
    const GRID_WIDTH = width;
    const GRID_HEIGHT = height;
    const GRID_COLUMN_COUNT = Math.floor(GRID_WIDTH / (CHECKBOX_SIZE + CHECKBOX_MARGIN * 2));
    const GRID_ROW_COUNT = Math.ceil(TOTAL_CHECKBOX/GRID_COLUMN_COUNT);
    const [states, setStates] = useState(() => new BitSet(TOTAL_CHECKBOX))
    const bitSetRef = useRef(new BitSet(TOTAL_CHECKBOX))
    const socket = io('https://35.224.36.139:42069', {rejectUnauthorized: false, withCredentials: false, credentials: false});
    socket.connect()
    useEffect(() => {
        socket.emitWithAck('get_states', '').then((initial) => {
            console.log('INITIAL STATES FROM BACKEND', initial)
            bitSetRef.current = new BitSet(initial)
            setStates(new BitSet(initial))
        })
        
        socket.on("states", (states) => {
            console.log(`STATES FROM BACKEND ${states}`)
            bitSetRef.current = new BitSet(states)
            setStates(new BitSet(states))
        })

        return () => {
            socket.off()
            socket.disconnect()
        }
    }, [])
    
    const Cell = useCallback(
        ({columnIndex, rowIndex}) => {
            const [checked, setCheck] = useState(false)
            var index = columnIndex  + (rowIndex * GRID_COLUMN_COUNT) 
            if (index >= TOTAL_CHECKBOX) {
                return null
            } 
            
            var state = bitSetRef.current.get(index)
            var isChecked = false
            if (state == 1) { isChecked = true }
            function handleCheck() {
                console.log(` CHECKED COLUMN ${columnIndex} WITH ROW ${rowIndex} AND INDEX ${index}`)
                bitSetRef.current.set(index)
                setStates(new BitSet(bitSetRef.current.bytesArray))
                setCheck(!checked)
                socket.emit("toggle_bit", String(index))  // Convert to string for the backend
            }
            return (<CheckBox 
                    key={index}
                    type='checkbox'
                    index={index}
                    onClick={handleCheck}
                    isChecked={isChecked}/>) 
        }, [states, bitSetRef]
    )
    console.log(`${GRID_WIDTH}`)
    console.log(`${GRID_HEIGHT}`)
    console.log(`${GRID_COLUMN_COUNT}`)
    console.log(`${GRID_ROW_COUNT}`)
    return (
    <div>
        <Grid
            cellComponent={Cell}
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
            columnCount={GRID_COLUMN_COUNT}
            rowCount={GRID_ROW_COUNT}
            columnWidth={CHECKBOX_SIZE}
            rowHeight={CHECKBOX_SIZE}
       />
    </div>)
}

export default App