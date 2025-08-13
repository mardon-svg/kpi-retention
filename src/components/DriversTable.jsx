import React from 'react';
import Button from './ui/Button';
import { Card, CardHeader, CardBody } from './ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from './ui/Table';
import Input from './ui/Input';
import Select from './ui/Select';

function DriversTable({ drivers, up, addDriver, recruiters, sources }) {
  return (
    <div className="section space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recruitment</h2>
          <Button onClick={addDriver} variant="primary">+ Driver</Button>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <Thead>
              <Tr>
                <Th>Driver</Th>
                <Th>Recruiter</Th>
                <Th>Source</Th>
                <Th>Hired (Start)</Th>
                <Th>Cost</Th>
                <Th>Time-to-Hire (d)</Th>
                <Th>Orientation</Th>
                <Th>Passed Orient</Th>
                <Th>Passed 90d</Th>
              </Tr>
            </Thead>
            <Tbody>
              {drivers.map((d) => (
                <Tr key={d.id}>
                  <Td><Input value={d.name} onChange={(e) => up(d.id, { name: e.target.value })} placeholder="Driver" className="w-40" /></Td>
                  <Td><Select value={d.recruiter} onChange={(e) => up(d.id, { recruiter: e.target.value })} className="w-36"><option value="">—</option>{recruiters.map(r => <option key={r}>{r}</option>)}</Select></Td>
                  <Td><Select value={d.source} onChange={(e) => up(d.id, { source: e.target.value })} className="w-36"><option value="">—</option>{sources.map(s => <option key={s}>{s}</option>)}</Select></Td>
                  <Td><Input type="date" value={d.startDate} onChange={(e) => up(d.id, { startDate: e.target.value })} className="w-40" /></Td>
                  <Td><Input type="number" value={d.hiringCost} onChange={(e) => up(d.id, { hiringCost: e.target.value })} placeholder="USD" className="w-28" /></Td>
                  <Td><Input type="number" value={d.timeToHireDays} onChange={(e) => up(d.id, { timeToHireDays: e.target.value })} placeholder="days" className="w-28" /></Td>
                  <Td><Input type="date" value={d.orientationDate} onChange={(e) => up(d.id, { orientationDate: e.target.value })} className="w-40" /></Td>
                  <Td><Select value={d.passedOrientation} onChange={(e) => up(d.id, { passedOrientation: e.target.value })} className="w-28"><option value="">—</option><option>Y</option><option>N</option></Select></Td>
                  <Td><Select value={d.passed90Days} onChange={(e) => up(d.id, { passed90Days: e.target.value })} className="w-28"><option value="">—</option><option>Y</option><option>N</option></Select></Td>
                </Tr>
              ))}
              {!drivers.length && (
                <Tr>
                  <Td colSpan={9} className="py-6 text-center text-gray-400">Add drivers to track recruitment KPIs.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

export default DriversTable;
